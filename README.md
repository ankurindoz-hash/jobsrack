# JobsRack mobile app

One app for all JobsRack portals (Canada, India, Australia, Global). Built with Expo (React Native).

## What it does
- First launch: pick a country (can be changed later in Account)
- Search jobs by title and city, infinite scroll, pull to refresh
- Job details with pay, badges, schedule, benefits and Ontario posting details
- Apply in the app with name, email, phone, resume (PDF/Word) and screening questions, no account needed
- Saved jobs that work offline
- Job alerts as push notifications (up to 5 alerts, at most one notification every 12 hours)
- Account links: sign in, messages, salaries, companies, post a job, privacy, terms

Data comes from each portal's `wp-json/jobsrack/v1` feed (WordPress snippet "JobsRack app API").
Applications go to the portal's existing guest-apply endpoint.

## Develop
```sh
npm install
npx expo start          # scan the QR code with Expo Go
npx tsc --noEmit        # type check
```

## Build and submit (Expo cloud, no Mac needed)
```sh
npx eas-cli login
npx eas-cli init                         # links this project to the Expo account (adds projectId)
npx eas-cli build -p android --profile production
npx eas-cli build -p ios --profile production
npx eas-cli submit -p android --latest   # needs the Google Play service account key in Expo
npx eas-cli submit -p ios --latest       # needs an App Store Connect API key in Expo
```

Bundle ID / package name: `com.jobsrack.app`
