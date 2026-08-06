export function getFundingNeed(project) {
  return Math.max(Number(project?.targetRemainingRupees || 0), 0);
}

export function getContributionPolicy(project) {
  if (!project?.budgetRequired || !project.targetBudgetRupees) return null;

  const maxPercent = project.targetBudgetRupees > 200000 ? 5 : 10;
  const totalMinRupees = Math.max(Math.ceil(project.targetBudgetRupees * 0.02), 500);
  const totalMaxRupees = Math.floor(project.targetBudgetRupees * (maxPercent / 100));
  const memberAllocatedRupees = Number(project.myAllocatedRupees || 0);
  const memberRemainingLimitRupees = Math.max(totalMaxRupees - memberAllocatedRupees, 0);
  const remainingRupees = getFundingNeed(project);
  const maxRupees = Math.min(memberRemainingLimitRupees, remainingRupees || memberRemainingLimitRupees);
  const additionalMinimumRupees = memberAllocatedRupees >= totalMinRupees ? 1 : totalMinRupees - memberAllocatedRupees;
  const minRupees = Math.min(additionalMinimumRupees, maxRupees);

  return {
    maxPercent,
    minRupees,
    maxRupees,
    memberAllocatedRupees,
    memberRemainingLimitRupees,
    totalMaxRupees
  };
}

export function getDefaultAllocationAmount(project, preferredAmount = 0) {
  const policy = getContributionPolicy(project);
  const remainingRupees = getFundingNeed(project);
  const upperLimit = policy?.maxRupees || remainingRupees || Number(preferredAmount || 0);
  const lowerLimit = policy?.minRupees || 1;
  const requestedAmount = Number(preferredAmount || 0);
  const amount = requestedAmount > 0 ? requestedAmount : lowerLimit;

  return Math.max(Math.min(amount, upperLimit), Math.min(lowerLimit, upperLimit));
}

export function rankFundingProjects(projects = []) {
  return projects
    .map((project, index) => ({ project, index }))
    .filter(({ project }) => !project.isDraft && project.budgetRequired && getFundingNeed(project) > 0)
    .sort((left, right) => {
      const progressDifference = Number(right.project.fundingPercent || 0) - Number(left.project.fundingPercent || 0);
      if (progressDifference) return progressDifference;

      const hasFunding = Number(left.project.fundingPercent || 0) > 0 || Number(right.project.fundingPercent || 0) > 0;
      if (hasFunding) {
        const remainingDifference = getFundingNeed(left.project) - getFundingNeed(right.project);
        if (remainingDifference) return remainingDifference;
      }

      return left.index - right.index;
    })
    .map(({ project }) => project);
}

export function canMemberFundProject(project) {
  const policy = getContributionPolicy(project);
  return getFundingNeed(project) > 0 && (!policy || policy.maxRupees > 0);
}

export function recommendNextFundingProject(projects = [], currentProjectId = "") {
  const eligibleProjects = rankFundingProjects(projects).filter(canMemberFundProject);
  return eligibleProjects.find((project) => project.id !== currentProjectId) || eligibleProjects[0] || null;
}

export function projectAfterAllocation(project, amountRupees) {
  const acceptedAmount = Math.max(Number(amountRupees || 0), 0);
  const allocatedRupees = Number(project.allocatedRupees || 0) + acceptedAmount;
  const targetBudgetRupees = Number(project.targetBudgetRupees || 0);
  const targetRemainingRupees = Math.max(targetBudgetRupees - allocatedRupees, 0);
  const fundingPercent = targetBudgetRupees > 0 ? Math.min(Math.round((allocatedRupees / targetBudgetRupees) * 100), 100) : 0;

  return {
    ...project,
    allocatedRupees,
    fundingPercent,
    myAllocatedRupees: Number(project.myAllocatedRupees || 0) + acceptedAmount,
    targetRemainingRupees
  };
}
