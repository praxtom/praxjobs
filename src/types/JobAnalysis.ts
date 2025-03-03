export interface JobAnalysisData {
    jobRoleSummary: {
        title: string;
        seniorityLevel: string;
        keyResponsibilities: string[];
        mainExpectations: string[];
        reportingStructure: string;
        teamSize: string;
        workMode: string; // remote/hybrid/onsite
    };
    compensationDetails: {
        baseSalaryRange: string;
        totalCompensationRange: string;
        equityDetails: {
            type: string;
            vestingSchedule: string;
            approximateValue: string;
        };
        benefits: {
            healthcare: string[];
            retirement: string[];
            additionalPerks: string[];
        };
        bonusStructure: {
            type: string;
            frequency: string;
            amount: string;
        };
        industryComparison: string;
    };
    skillsAndQualifications: {
        hardSkills: string[];
        softSkills: string[];
        requiredCertifications: string[];
        educationLevel: string;
        experienceRequired: string;
        preferredSkills: string[];
    };
    companyInsights: {
        name: string;
        size: string;
        industry: string;
        fundingDetails: {
            stage: string;
            totalRaised: string;
            lastRound: string;
            keyInvestors: string[];
        };
        growth: {
            metrics: string[];
            revenueRange: string;
            userGrowth: string;
        };
        culture: {
            values: string[];
            workLifeBalance: string;
            learningOpportunities: string;
            diversityInitiatives: string[];
        };
        employeeStats: {
            ratings: {
                overall: number;
                workLifeBalance: number;
                careerGrowth: number;
                compensation: number;
                culture: number;
            };
            averageTenure: string;
            turnoverRate: string;
            promotionRate: string;
        };
        competitors: string[];
    };
    careerGrowth: {
        promotionPath: string[];
        learningBudget: string;
        mentorshipPrograms: string[];
        skillDevelopmentOpportunities: string[];
    };
    jobMarketTrends: {
        currentDemand: string;
        growthProjection: string;
        industryTrends: string[];
        salaryTrends: string;
        skillsInDemand: string[];
        competitorSalaries: string[];
    };
    workCulture: {
        workSchedule: string;
        remotePolicy: string;
        workEnvironment: string[];
        teamDynamics: string;
        managementStyle: string;
        redFlags: string[];
        positiveIndicators: string[];
    };
    applicationTips: {
        resumeAdvice: string[];
        coverLetterTips: string[];
        interviewPrep: {
            commonQuestions: string[];
            technicalAssessment: string;
            processSteps: string[];
        };
        negotiationTips: string[];
    };
}
