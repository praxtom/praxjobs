# Career Assistant Platform

Elevate your career journey with our cutting-edge platform, expertly crafted using Astro, TypeScript, and Firebase. Seamlessly navigate your job search with powerful tools for professional resume creation, smart job tracking, and holistic career development—all in one intuitive experience.

## 🌟 Current Features

## Our Tools in Detail

### 1. Job Profile Analysis

Our Job Profile Analysis tool uses AI-powered technology to provide comprehensive insights into job descriptions, helping you better understand employer expectations and requirements.

**Key Features:**

- **Job Role Breakdown**: Detailed analysis of job responsibilities, seniority level, and reporting structure
- **Skills Assessment**: Identifies required hard skills, soft skills, and certifications
- **Compensation Analysis**: Estimates salary ranges, benefits, and bonus structures
- **Company Insights**: Provides information about company culture, growth metrics, and employee statistics
- **Career Growth Path**: Maps potential career advancement opportunities within the role
- **Work Culture Analysis**: Highlights red and green flags within the organization
- **Application Strategy**: Offers personalized tips to improve your application success rate

### 2. Resume Builder

Our Resume Builder tool helps you create professionally tailored resumes that match specific job descriptions and highlight your unique qualifications.

**Key Features:**

- **AI-Powered Content Generation**: Creates tailored content based on the job description
- **Multiple Professional Templates**: Choose from various design options for different industries
- **Real-time Preview**: See changes as you make them
- **Resume Import**: Upload and edit existing resumes or start fresh
- **ATS Optimization**: Ensures your resume passes through Applicant Tracking Systems
- **Version History**: Save multiple versions of your resume for different job applications
- **Format Preservation**: Maintains professional formatting throughout the document

### 3. Cover Letter Generator

Our Cover Letter Generator helps you craft compelling, personalized cover letters that complement your resume and address specific job requirements.

**Key Features:**

- **Customized Content**: Generates content tailored to both the job and your experience
- **Multiple Templates**: Different styles including Professional, Creative, Technical, and Executive
- **Resume Integration**: Seamlessly incorporates details from your resume
- **Tone Adjustment**: Customize the writing style to match company culture
- **Formatting Options**: Professional layout with customizable sections
- **Real-time Preview**: Instantly see how your cover letter will look
- **Export Options**: Download in multiple formats for easy sharing

### 4. Job Application Tracker

Our Job Application Tracker helps you organize and monitor your job search process from start to finish.

**Key Features:**

- **Visual Pipeline**: Track applications through different stages (Saved, Applied, Interview, Offer)
- **Application Details**: Store company information, position details, application dates, and URLs
- **Notes System**: Record interview feedback, follow-up dates, and key contacts
- **Smart Organization**: Sort and filter applications by status, date, company, or position
- **Timeline View**: Visualize your job search progress chronologically
- **Statistical Insights**: Track application success rates and interview conversions
- **Reminder System**: Never miss a follow-up or deadline with built-in reminders

### 5. Interview Preparation

Our Interview Preparation tool helps you practice and prepare for interviews with AI-generated questions tailored to specific jobs and companies.

**Key Features:**

- **Company-Specific Questions**: Generates questions based on the company's values and culture
- **Role-Based Questions**: Technical and behavioral questions specific to the position
- **Resume Import**: Analyzes your resume to identify potential interview focus areas
- **Answer Feedback**: Provides constructive feedback on your practice answers
- **Common Questions Library**: Access to frequently asked questions across industries
- **Interview Strategy Tips**: Personalized advice to improve your interview performance
- **Preparation Checklist**: Comprehensive list of pre-interview tasks and research topics

### Resume Manager

- **Resume Storage**: Save your resumes for future reference
- **Resume Import**: Easily add your existing resumes for editing

### Powerful User Features

- **Profile Management**: Create and maintain your professional profile with detailed information
- **Cloud Storage**: Securely store and organize all your career documents in one place
- **Preference Settings**: Customize your experience with personalized settings for notifications and display options

### Robust Platform Features

- **Secure Authentication**: Firebase-powered secure login and signup system with email verification
- **Account Recovery**: Streamlined password recovery process with email-based verification
- **Unified Dashboard**: Access all tools and features through an intuitive, centralized dashboard
- **Comprehensive Help Center**: Detailed documentation, tooltips, and guides for all platform features

### Modern Technical Foundation

- **Performance-Focused**: Built with Astro for optimal loading speeds and performance
- **Type-Safe Development**: Implemented with TypeScript for enhanced reliability
- **Responsive Interface**: Fully responsive design that works seamlessly across desktop and mobile devices
- **Dark Mode Support**: Thoughtfully designed dark mode that reduces eye strain during night-time use
- **Security First**: Robust authentication and data protection powered by Firebase

## How Our Tools Work Together

Our platform offers a comprehensive career management ecosystem where each tool complements the others:

1. **Start with Job Analysis**: Understand what employers are looking for with our Job Profile Analysis
2. **Create Targeted Documents**: Use these insights to build tailored resumes and cover letters
3. **Track Your Applications**: Manage your job search process with our Job Application Tracker
4. **Prepare for Interviews**: When you receive interview invitations, use our Interview Preparation tool

This integrated workflow streamlines your job search and maximizes your chances of success at each stage.

## Getting Started

Begin your professional journey by creating an account through our secure signup process. Once logged in, you'll have immediate access to our suite of career tools. Our comprehensive help documentation will guide you through making the most of each feature.

Visit our [login](/login) or [signup](/signup) page to get started. Need help? Check out our [documentation](/help) for detailed guides and tips.

## 🎯 Core Features

### 1. Resume Architect (`/components/tools/Resume.astro`, `/components/tools/ResumeManager.astro`)

#### Key Features

- **AI-Powered Content Generation**: Real-time streaming content generation with custom formatting
- **Template Management**: Multiple professional templates with customizable sections
- **Version History**: Automatic saving and version tracking in Firebase
- **Resume Import**: Import existing resumes from Firebase storage

#### Technical Implementation

```typescript
// Firebase Integration
- PersistentDocumentService for version control
- Firestore for data persistence
- Real-time content streaming with SSE

// Features
- Custom template system with dynamic sections
- Real-time content validation and formatting
- Automatic progress saving
```

### 2. Job Analysis Engine (`/components/tools/JobAnalysis.astro`)

#### Key Features

- **Comprehensive Analysis**: Detailed job role breakdown
- **Compensation Analysis**: Salary ranges and benefits evaluation
- **Company Culture Insights**: Work environment assessment
- **Market Position**: Industry trends and company standing

#### Technical Implementation

```typescript
// Data Structure
- Job Role Summary
  - Seniority Level
  - Key Responsibilities
  - Reporting Structure
  - Team Size

// Analysis Components
- Skills Assessment
- Compensation Details
- Growth Opportunities
- Application Strategy
```

### 3. Cover Letter Generator (`/components/tools/CoverLetter.astro`)

#### Key Features

- **Multiple Templates**: Professional, Creative, Technical, and Executive styles
- **Real-time Preview**: Live content generation with streaming updates
- **Resume Integration**: Direct import from saved resumes
- **Custom Instructions**: Personalized tone and content guidance

#### Technical Implementation

```typescript
// Template System
const coverLetterTemplates = [
  {
    id: 'professional',
    name: 'Professional',
    promptModifier: 'formal, business-oriented'
  },
  {
    id: 'creative',
    name: 'Creative',
    promptModifier: 'innovative, engaging'
  }
]

// Features
- Streaming content generation
- Format preservation
- Custom styling options
```

### 4. Job Application Tracker (`/components/tools/JobTrackerComponent.astro`)

#### Key Features

- **Application Pipeline**: Visual status tracking
- **Rich Job Details**: Company, position, and application date
- **Notes Management**: Personal notes and follow-ups
- **Timeline View**: Chronological application history

#### Technical Implementation

```typescript
// Firestore Schema
interface Job {
  id: string;
  company: string;
  position: string;
  status: string;
  dateApplied: Timestamp;
  url?: string;
  jobDescription?: string;
  notes?: string;
  createdAt: Timestamp;
}

// Features
- Real-time updates with Firestore
- Drag-and-drop status updates
- Automatic date tracking
```

## 🛠️ Technology Stack

### Frontend

- **Framework**: Astro 5.1.9
- **UI Components**: Custom Tailwind components
- **State Management**: Firebase real-time updates

### Backend

- **Server**: Astro SSR with API routes
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth with Google provider
- **Storage**: Firebase Storage for documents

### AI Integration

- **Content Generation**: Streaming API integration
- **Analysis**: Custom NLP pipeline
- **Data Processing**: Server-side analysis tools

## 💳 Payment Integration

### Razorpay Implementation

```typescript
// API Routes
- /api/create-payment-link: Secure payment initialization
- /api/razorpay-webhook: Event handling and verification
```

## 🔐 Security Features

- **Authentication**: Firebase Auth with session management
- **API Security**: Request validation and rate limiting
- **Data Access**: Firestore security rules
- **Input Sanitization**: Server-side validation

## 🚀 Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Configure environment:
   ```env
   FIREBASE_API_KEY=your_key
   RAZORPAY_KEY_ID=your_key
   RAZORPAY_SECRET=your_secret
   ```
4. Start development: `npm run dev`

## 📚 API Documentation

API documentation and examples available in `/docs/api`

## 🤝 Contributing

We welcome contributions! See CONTRIBUTING.md for guidelines.

## 📝 License

MIT License - see LICENSE for details d

```
/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   └── Card.astro
│   ├── layouts/
│   │   └── Layout.astro
│   └── pages/
│       └── index.astro
└── package.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                | Action                                             |
| :--------------------- | :------------------------------------------------- |
| `npm install`          | Installs dependencies                              |
| `npm run dev`          | Starts local dev server at `localhost:3000`        |
| `npm run build`        | Build your production site to `./dist/`            |
| `npm run preview`      | Preview your build locally, before deploying       |
| `npm run astro ...`    | Run CLI commands like `astro add`, `astro preview` |
| `npm run astro --help` | Get help using the Astro CLI                       |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).

#Coming Soon

- Academic Counsellors aroudn you
- Search bar Instead of chatbot
