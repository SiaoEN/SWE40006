# KCH Bites

KCH Bites is a web application that helps users decide what to eat in Kuching. Users can discover restaurants based on distance, rating, food type, and operating hours, then use map guidance to reach their destination.

The platform also includes a community layer where registered users can comment, upload photos, and rate restaurants. An admin-managed feedback and moderation workflow is included, plus a spin wheel feature for users who cannot decide what to eat.

## Project Objective

Build a practical food discovery platform for Kuching that supports:

- Smart search and filtering
- Restaurant navigation through maps
- Community engagement through comments and ratings
- Admin moderation and feedback management
- Secure account access with role-based permissions

## Key Features

### Food Discovery and Search

- Search restaurants by name or keyword
- Filter by:
	- Operation hours (set day / time)
	- Food categories (Western, Korean, Japanese, Chinese etc.)
	- Distance (use range)
	- Rating (1 to 5 stars)
- Filter out all closed restaurant at the moment (real-time)

### Maps and Navigation

- Embedded map display for restaurant locations
- User can allow site location access
- Route and location guidance to selected restaurants

### Community and Social Features

- Registered users can:
	- Comment on restaurants
	- Upload photos
	- Rate restaurants
- Community feed includes:
	- Posted comments
	- Like/unlike interactions
	- Direct links to related restaurant pages
- Moderation and safety:
	- Restricted words filtering
	- Report comments/photos
	- Admin can add/delete comments when needed

### User and Admin Features

- Profile management for registered users and admin:
	- Username
	- Password
	- Email
	- Profile picture
- Feedback system:
	- Registered users submit feedback to admin
	- Admin can receive and manage feedback
	- Feedback management area is admin-only

### Extra Feature

- Spin wheel (bottom-right quick action) to randomly suggest what to eat

## Frontend Scope (React)

### 1. Login Page

- User login form
- Validation and error feedback

### 2. Register Page

- New account registration
- Username/password validation

### 3. Main Page

- Logo
- Latest News icon
- Profile access
- Welcome message
- Search bar
- Filters:
	- Operation hours
	- Food categories
	- Distance
	- Rating
- Maps display
- Sidebar:
	- Edit profile
	- Feedback
	- Community page
	- Logout

### 4. Community Page

- Show posted comments and media
- Like/unlike posts
- Restaurant direct-link navigation
- Admin moderation controls
- Restricted words handling
- Reporting workflow for comments/photos

### 5. Edit Profile Page

- Available to registered users and admin
- Update username, password, email, profile picture

### 6. Latest News / Notification Page

- Shows updates such as:
	- Newly opened restaurants
	- Promotions
- User can view liked posts
- User get notified about who like their comments/posts

### 7. Feedback Page

- Registered user feedback submission form
- Admin-only feedback management interface

## Backend Scope (Node.js)

- Password hashing for secure credential storage
- Username and password validation
- Role-based access control (user/admin)
- APIs for:
	- Authentication and profile management
	- Restaurant listing, search, and filters
	- Comments, photos, likes, ratings
	- Feedback submission and admin review
	- News/notification content
- Integration with Google Maps Display API
- Support for location permission usage in frontend flows

## Tech Stack

- Frontend: React
- Backend: Node.js
- Database: MongoDB Atlas
- Hosting: Render
- CI/CD: GitHub + GitHub Actions
- Monitoring: Render + UptimeRobot

## Team Setup (First Time)

Use this section when a group member opens the project for the first time.

### 1. Install Frontend Dependencies

```bash
cd frontend/"KCH Bites"
npm install
```

### 2. Run Frontend in Development

```bash
npm run dev
```

Then open the local URL shown in the terminal (usually http://localhost:5173).

### 3. Recommended Team Practice

- Keep `package-lock.json` committed to the repository
- Use `npm ci` instead of `npm install` for consistent package versions

## Deployment Overview

- Frontend and backend deployed on Render
- Database hosted on MongoDB Atlas
- CI/CD pipeline triggered via GitHub Actions on repository updates
- Service uptime and availability monitored with UptimeRobot

## Security and Access Control

- Password hashing before database storage
- Input validation for username and password
- Role-based route and feature protection
- Restricted words checks in community content
- Report flow for potentially abusive uploads/comments

## Course Context

This repository supports SWE40006 project development for KCH Bites.
