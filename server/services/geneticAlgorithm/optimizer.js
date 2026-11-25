/**
 * Genetic Algorithm Timetable Optimization Layer
 * 
 * Provides an evolutionary optimization layer on top of constraint-based scheduling:
 * 1. Evaluates Hard Constraints (Penalties: Faculty clashes, Room clashes, Cohort/Batch clashes, Break overlaps)
 * 2. Evaluates Soft Constraints (Rewards: Semester practical time preferences, Balanced day distribution,
 *    Designated classroom adherence, Balanced faculty workload, Reduced student idle gaps)
 * 3. Applies Selection, Safe Crossover, Mutation, Elitism, and Conflict Repair
 */

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];

// Valid 2-hour practical continuous non-break blocks
const PRACTICAL_BLOCKS = [
  { startSlotNumber: 1, endSlotNumber: 2, label: "10:00 - 12:00", type: "MORNING" },
  { startSlotNumber: 4, endSlotNumber: 5, label: "12:45 - 2:45", type: "AFTERNOON_EARLY" },
  { startSlotNumber: 7, endSlotNumber: 8, label: "3:00 - 5:00", type: "AFTERNOON_LATE" }
];

const VALID_LECTURE_SLOTS = [1, 2, 4, 5, 7, 8];

/**
 * Calculates fitness score for a candidate chromosome (schedule assignments)
 */
function evaluateFitness(chromosome, context) {
  const {
    availabilityMap,
    slotMap,
    semesterPreferences,
    designatedRooms,
    facultyMap,
    roomMap
  } = context;

  let hardViolations = 0;
  let softScore = 0;

  // Collision tracking maps
  const facultyOccupancy = new Map(); // key: facId_day_slot -> count
  const roomOccupancy = new Map();    // key: roomId_day_slot -> count
  const cohortNonPracticalOccupancy = new Map(); // key: cohortId_day_slot -> count
  const cohortPracticalOccupancy = new Set();    // key: cohortId_day_slot
  const batchOccupancy = new Map();   // key: batchCode_day_slot -> count

  // Distribution & compactness tracking
  const practicalCountByDay = { MONDAY: 0, TUESDAY: 0, WEDNESDAY: 0, THURSDAY: 0, FRIDAY: 0 };
  const facultyDailyHours = new Map(); // key: facId_day -> hours
  const cohortDaySlots = new Map();    // key: cohortId_day -> Set of slot numbers

  for (const gene of chromosome) {
    const {
      cohortId,
      subjectId,
      facultyId,
      roomId,
      day,
      startSlotNumber,
      durationSlots,
      type,
      batch,
      semesterNumber
    } = gene;

    const slots = durationSlots === 2
      ? [startSlotNumber, startSlotNumber + 1]
      : [startSlotNumber];

    // Check breaks
    for (const s of slots) {
      if (s === 3 || s === 6) {
        hardViolations += 1; // Class across lunch or recess
      }
    }

    // Check availability constraints
    if (availabilityMap && slotMap) {
      for (const s of slots) {
        const slotObj = slotMap.get(`${day}_${s}`);
        if (slotObj) {
          const facKey = `FACULTY_${facultyId}_${day}`;
          const allowedFacSlots = availabilityMap.get(facKey);
          if (allowedFacSlots && !allowedFacSlots.has(String(slotObj._id))) {
            hardViolations += 1;
          }

          const rmKey = `ROOM_${roomId}_${day}`;
          const allowedRmSlots = availabilityMap.get(rmKey);
          if (allowedRmSlots && !allowedRmSlots.has(String(slotObj._id))) {
            hardViolations += 1;
          }
        }
      }
    }

    // Practical must be exactly 2 consecutive slots in a valid practical block
    if (type === "PRACTICAL") {
      const isValidBlock = PRACTICAL_BLOCKS.some(
        (b) => b.startSlotNumber === startSlotNumber && b.endSlotNumber === startSlotNumber + 1
      );
      if (!isValidBlock) {
        hardViolations += 1;
      }
      if (practicalCountByDay[day] !== undefined) {
        practicalCountByDay[day] += 1;
      }

      // Check lab requirement
      const room = roomMap.get(String(roomId));
      if (!room || room.type !== "LAB") {
        hardViolations += 1;
      }
    }

    // Occupancy & Collisions
    for (const s of slots) {
      // Faculty clash
      const facKey = `${facultyId}_${day}_${s}`;
      const facCount = (facultyOccupancy.get(facKey) || 0) + 1;
      facultyOccupancy.set(facKey, facCount);
      if (facCount > 1) hardViolations += 1;

      // Room clash
      const roomKey = `${roomId}_${day}_${s}`;
      const rmCount = (roomOccupancy.get(roomKey) || 0) + 1;
      roomOccupancy.set(roomKey, rmCount);
      if (rmCount > 1) hardViolations += 1;

      // Cohort clash: Theory lectures, tutorials, and projects cannot overlap for the same cohort
      if (type !== "PRACTICAL") {
        const cohKey = `${cohortId}_${day}_${s}`;
        const cohCount = (cohortNonPracticalOccupancy.get(cohKey) || 0) + 1;
        cohortNonPracticalOccupancy.set(cohKey, cohCount);
        if (cohCount > 1) hardViolations += 1;
      } else {
        cohortPracticalOccupancy.add(`${cohortId}_${day}_${s}`);
      }

      // Batch clash (practical batches cannot have two sessions simultaneously)
      if (batch) {
        const batchKey = `${cohortId}_${batch}_${day}_${s}`;
        const bCount = (batchOccupancy.get(batchKey) || 0) + 1;
        batchOccupancy.set(batchKey, bCount);
        if (bCount > 1) hardViolations += 1;
      }

      // Track faculty daily hours
      const facDayKey = `${facultyId}_${day}`;
      facultyDailyHours.set(facDayKey, (facultyDailyHours.get(facDayKey) || 0) + 1);

      // Track cohort day slots for compactness
      const cdKey = `${cohortId}_${day}`;
      if (!cohortDaySlots.has(cdKey)) cohortDaySlots.set(cdKey, new Set());
      cohortDaySlots.get(cdKey).add(s);
    }

    // -------------------------------------------------------------
    // SOFT CONSTRAINTS EVALUATION
    // -------------------------------------------------------------

    // 1. Semester-specific practical timing preference
    if (type === "PRACTICAL") {
      // Sem 3 -> prefer 3:00 - 5:00 (slot 7)
      if (semesterNumber === 3 && startSlotNumber === 7) {
        softScore += 50;
      } else if (semesterNumber === 3) {
        softScore -= 10;
      }

      // Sem 5 -> prefer 12:45 - 2:45 (slot 4)
      if (semesterNumber === 5 && startSlotNumber === 4) {
        softScore += 50;
      } else if (semesterNumber === 5) {
        softScore -= 10;
      }

      // Sem 7 -> prefer 10:00 - 12:00 (slot 1)
      if (semesterNumber === 7 && startSlotNumber === 1) {
        softScore += 50;
      } else if (semesterNumber === 7) {
        softScore -= 10;
      }
    }

    // 2. Designated classroom adherence for lectures
    if (type === "LECTURE" && designatedRooms) {
      const designatedRoomId = designatedRooms[semesterNumber];
      if (designatedRoomId && String(roomId) === String(designatedRoomId)) {
        softScore += 25; // Lecture in semester designated classroom
      }
    }
  }

  // 3. Balanced practical distribution across days (reward variance near 0)
  const practicalCounts = Object.values(practicalCountByDay);
  const totalPracticals = practicalCounts.reduce((a, b) => a + b, 0);
  if (totalPracticals > 0) {
    const avgPracticalsPerDay = totalPracticals / 5;
    let dayVariance = 0;
    for (const count of practicalCounts) {
      dayVariance += Math.abs(count - avgPracticalsPerDay);
    }
    // High balance reward, penalize heavy skew
    if (dayVariance <= 2) {
      softScore += 60;
    } else {
      softScore -= Math.round(dayVariance * 8);
    }
  }

  // Hard constraint: Cohort cannot have lecture/tutorial/project during practical window
  for (const [cohKey, _] of cohortNonPracticalOccupancy.entries()) {
    if (cohortPracticalOccupancy.has(cohKey)) {
      hardViolations += 1;
    }
  }

  // 4. Faculty daily workload balance (avoid > 4 hours in a single day)
  for (const [_, hours] of facultyDailyHours.entries()) {
    if (hours <= 4) {
      softScore += 5;
    } else {
      softScore -= (hours - 4) * 15; // Excessive hours penalty
    }
  }

  // 5. Schedule Compactness & Idle Gap Minimization (Consecutive session rewards)
  for (const [_, occupiedSlots] of cohortDaySlots.entries()) {
    // Reward consecutive morning blocks (slots 1 & 2)
    if (occupiedSlots.has(1) && occupiedSlots.has(2)) {
      softScore += 15;
    }
    // Reward consecutive early afternoon blocks (slots 4 & 5)
    if (occupiedSlots.has(4) && occupiedSlots.has(5)) {
      softScore += 15;
    }
    // Reward consecutive late afternoon blocks (slots 7 & 8)
    if (occupiedSlots.has(7) && occupiedSlots.has(8)) {
      softScore += 15;
    }
    // Penalize isolated 1-hour gap between lectures
    if (occupiedSlots.has(1) && !occupiedSlots.has(2) && (occupiedSlots.has(4) || occupiedSlots.has(5))) {
      softScore -= 10;
    }
  }

  // Total fitness: Hard constraint violations receive heavy negative penalties
  const fitness = (hardViolations * -1000) + softScore;

  return {
    fitness,
    hardViolations,
    softScore,
    practicalDistribution: practicalCountByDay
  };
}

/**
 * Mutates a gene without violating basic data validity
 */
function mutateGene(gene, context) {
  const mutated = { ...gene };
  const { candidateRooms, eligibleFacultyMap } = context;

  // Decide mutation type (Slot mutation 70%, Room mutation 20%, Faculty mutation 10%)
  const rand = Math.random();

  if (rand < 0.7) {
    if (mutated.type !== "PRACTICAL") {
      // Mutate day and slot for Lectures / Tutorials / Projects
      const randomDay = DAYS[Math.floor(Math.random() * DAYS.length)];
      mutated.day = randomDay;
      const slot = VALID_LECTURE_SLOTS[Math.floor(Math.random() * VALID_LECTURE_SLOTS.length)];
      mutated.startSlotNumber = slot;
      mutated.durationSlots = (mutated.type === "PROJECT" ? 2 : 1);
    }
    // Practicals are anchored to the official semester time window to maintain synchronization across batches
  } else if (rand < 0.9 && candidateRooms) {
    // Mutate room
    const matchingRooms = candidateRooms.filter((r) =>
      mutated.type === "PRACTICAL" ? r.type === "LAB" : r.type === "CLASSROOM"
    );
    if (matchingRooms.length > 0) {
      const chosenRoom = matchingRooms[Math.floor(Math.random() * matchingRooms.length)];
      mutated.roomId = chosenRoom._id;
    }
  } else if (eligibleFacultyMap) {
    // Mutate faculty from eligible faculty list for this subject
    const eligible = eligibleFacultyMap.get(String(mutated.subjectId));
    if (eligible && eligible.length > 1) {
      const chosenFac = eligible[Math.floor(Math.random() * eligible.length)];
      mutated.facultyId = chosenFac._id;
    }
  }

  return mutated;
}

/**
 * Genetic Algorithm Main Evolutionary Optimizer
 */
function optimizeWithGA({
  initialChromosome,
  context,
  populationSize = 12,
  generations = 25,
  mutationRate = 0.15
}) {
  // 1. Initialize population from initial feasible chromosome
  let population = [];

  // Seed chromosome 0 is the initial baseline
  population.push({
    chromosome: initialChromosome.map((g) => ({ ...g })),
    ...evaluateFitness(initialChromosome, context)
  });

  // Generate diverse initial candidate variants
  for (let i = 1; i < populationSize; i++) {
    const candidate = initialChromosome.map((gene) => {
      if (Math.random() < 0.25) {
        return mutateGene(gene, context);
      }
      return { ...gene };
    });

    population.push({
      chromosome: candidate,
      ...evaluateFitness(candidate, context)
    });
  }

  // Sort by fitness descending
  population.sort((a, b) => b.fitness - a.fitness);

  let bestIndividual = population[0];
  let generationCount = 0;

  for (let gen = 0; gen < generations; gen++) {
    generationCount++;
    const nextGeneration = [];

    // Elitism: Preserve top 2 best candidates
    nextGeneration.push(population[0]);
    if (population.length > 1) {
      nextGeneration.push(population[1]);
    }

    // Breed remainder of population
    while (nextGeneration.length < populationSize) {
      // Tournament selection (size 3)
      const selectParent = () => {
        const idx1 = Math.floor(Math.random() * population.length);
        const idx2 = Math.floor(Math.random() * population.length);
        const idx3 = Math.floor(Math.random() * population.length);
        const pool = [population[idx1], population[idx2], population[idx3]];
        pool.sort((a, b) => b.fitness - a.fitness);
        return pool[0];
      };

      const parentA = selectParent();
      const parentB = selectParent();

      // Timetable-safe uniform crossover
      const childGenes = [];
      for (let g = 0; g < initialChromosome.length; g++) {
        const gene = Math.random() < 0.5
          ? { ...parentA.chromosome[g] }
          : { ...parentB.chromosome[g] };

        // Apply mutation
        if (Math.random() < mutationRate) {
          childGenes.push(mutateGene(gene, context));
        } else {
          childGenes.push(gene);
        }
      }

      const evaluated = {
        chromosome: childGenes,
        ...evaluateFitness(childGenes, context)
      };

      nextGeneration.push(evaluated);
    }

    // Sort next generation
    nextGeneration.sort((a, b) => b.fitness - a.fitness);
    population = nextGeneration;

    if (population[0].fitness > bestIndividual.fitness) {
      bestIndividual = population[0];
    }

    // Early termination if optimal conflict-free solution with high soft score found
    if (bestIndividual.hardViolations === 0 && bestIndividual.softScore >= 180) {
      break;
    }
  }

  return {
    bestChromosome: bestIndividual.chromosome,
    fitness: bestIndividual.fitness,
    hardViolations: bestIndividual.hardViolations,
    softScore: bestIndividual.softScore,
    practicalDistribution: bestIndividual.practicalDistribution,
    generationsRun: generationCount
  };
}

module.exports = {
  evaluateFitness,
  optimizeWithGA,
  PRACTICAL_BLOCKS,
  VALID_LECTURE_SLOTS
};
