export type JobApplication = {
    companyName: string;
    jobTitle: string;
    applicationDate: string;
    status: 'Applied' | 'Interview' | 'Offer' | 'Rejected';
    jobPostingUrl: string;
    jobDescription: string;
};
