# Overview

ConsentIQ is a full-stack web application designed for managing video consent workflows with a subscription-based business model. The platform enables authorized users to create consent sessions, generate QR codes for participant access, capture video consent recordings, and track consent status throughout the process. The application features Stripe-powered subscriptions at $40/month and $400/year, secure video handling, user authentication, and comprehensive consent management with configurable data retention policies.

# User Preferences

Preferred communication style: Simple, everyday language.

## Login & Navigation Flow
- **ALL users** (new and returning) redirect to `/consent/new` after successful login - they're logging in to use the app
- Payment success flow: Stripe checkout → /success → subscription webhook activates → auto-redirect to /consent/new
- Session persistence: HTTP-only cookies automatically restore sessions on page reload

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript, using Vite as the build tool
- **UI Library**: Radix UI components with shadcn/ui design system
- **Styling**: Tailwind CSS with custom design tokens and responsive layouts
- **State Management**: TanStack Query for server state and custom hooks for local state
- **Routing**: Wouter for client-side routing with protected route patterns
- **Forms**: React Hook Form with Zod validation schemas

## Backend Architecture
- **Runtime**: Node.js with Express.js REST API
- **Database**: PostgreSQL (NeonDB) with Drizzle ORM for type-safe database operations
- **Cloud Storage**: Supabase storage buckets for videos and images
- **Authentication**: JWT-based authentication with HTTP-only cookies for security
- **File Structure**: Monorepo structure with shared schema definitions between client and server

## Database Design (NeonDB PostgreSQL)
- **Users Table**: Stores user credentials with bcrypt password hashing, Stripe customer and subscription tracking, profile picture URLs (Supabase)
- **Consent Sessions Table**: Tracks consent workflow state, participant information, QR codes, retention policies
- **Video Assets Table**: Manages video metadata, Supabase storage URLs, encryption status, and file integrity checksums
- **Enums**: PostgreSQL enums for consent status (pending, granted, denied, revoked)
- **Admin System**: Role-based access control with admin/user roles

### Field Mapping Pattern (CRITICAL)
**Database columns use snake_case, TypeScript properties use camelCase**
- `server/storage.ts` contains helper functions that MUST be used for ALL database operations:
  - `mapUserFromDb(data)` - Maps User table fields (full_name → fullName, etc.)
  - `mapVideoAssetFromDb(data)` - Maps VideoAsset fields (storage_url → storageUrl, etc.)
  - `mapConsentSessionFromDb(data)` - Maps ConsentSession fields (qr_code_id → qrCodeId, etc.)
- **NEVER return raw database data** - always use these mapper functions
- This prevents snake_case/camelCase mismatches that break frontend-backend communication

## Subscription System
- **Payment Gateway**: Stripe integration for secure payment processing
- **Subscription Tiers**: Monthly ($40/month) and Annual ($400/year) plans with $80 annual savings
- **Checkout Flow**: Seamless registration-to-subscription flow with plan selection preserved through auth
- **Stripe Elements**: Embedded payment form with customized theming for consistent brand experience
- **Webhook Integration**: Real-time subscription status updates via Stripe webhooks
- **Customer Management**: Automatic Stripe customer creation and subscription tracking in user records

## Authentication & Security
- **Password Security**: bcrypt hashing with salt rounds for password storage
- **Session Management**: JWT tokens stored in secure HTTP-only cookies
- **CORS**: Configured for credential inclusion across client-server communication
- **Environment Variables**: Secure configuration management for JWT secrets and database credentials

## Cloud Storage Architecture (Supabase)
- **Storage Provider**: Supabase cloud storage for scalable, persistent file management
- **Bucket Structure**: 
  - `consent-videos` (private): Stores video consent recordings with access controls
  - `profile-pictures` (public): Stores user profile images with public access
- **Upload Service**: Dedicated `supabaseStorage.ts` module for handling all file operations
- **Database Integration**: URLs stored in PostgreSQL (`profile_picture_url`, `storage_url` columns)
- **Migration Strategy**: Automatic base64-to-cloud migration reduces database size by 99% per image

## Video Processing Pipeline
- **Upload Flow**: Direct upload to Supabase storage with signed URLs
- **Metadata Extraction**: Automatic capture of file size, duration, resolution, and MIME type validation
- **Storage Security**: Encrypted cloud storage with integrity verification via checksums
- **Retention Management**: Configurable data retention periods with automatic cleanup workflows

## API Design Patterns
- **RESTful Endpoints**: Standard HTTP methods with consistent error handling
- **Type Safety**: Shared Zod schemas between frontend and backend for validation
- **Middleware**: Cookie parsing, request logging, and authentication middleware
- **Error Handling**: Structured error responses with appropriate HTTP status codes

# External Dependencies

## Core Technologies
- **Database**: PostgreSQL (configured for Neon serverless in production)
- **ORM**: Drizzle Kit for migrations and schema management
- **Authentication**: JSON Web Tokens (jsonwebtoken library)
- **Password Hashing**: bcryptjs for secure password storage
- **Payment Processing**: Stripe for subscription management and recurring billing

## UI & Frontend Libraries
- **Component Library**: Radix UI primitives for accessible components
- **Styling**: Tailwind CSS with PostCSS processing
- **Icons**: Lucide React for consistent iconography
- **QR Codes**: qrcode library for generating participant access codes

## Development Tools
- **Build Tool**: Vite with React plugin and TypeScript support
- **Code Quality**: ESBuild for production bundling
- **Development**: tsx for TypeScript execution in development
- **Replit Integration**: Specialized plugins for Replit development environment

## Validation & Type Safety
- **Schema Validation**: Zod for runtime type checking and API validation
- **Form Validation**: @hookform/resolvers for form schema integration
- **TypeScript**: Strict type checking with path mapping for clean imports

## Current Storage Implementation
- **Supabase Cloud Storage**: Active implementation for videos and profile pictures
  - consent-videos bucket (private, access controlled)
  - profile-pictures bucket (public)
  - Direct URL integration with PostgreSQL database
  - 99% reduction in database size vs base64 storage

## Potential Future Integrations
- **CDN**: Content delivery network for optimized video streaming
- **Email Services**: SMTP integration for consent notifications
- **Analytics**: User interaction tracking and consent workflow analytics