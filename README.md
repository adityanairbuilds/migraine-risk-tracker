# Migraine Risk Tracker

React Native / Expo app that tries to guess migraine risk from the weather. Same stack as my Course Correct app (Expo Router, TypeScript, Firebase).

Not a medical device btw, theres a disclaimer in the app too.

## what it does

- looks at the forecast (pressure drops, humidity, temp swings) and gives you a risk score for the next 24 hrs, using the free Open-Meteo API so no api key needed
- lets you log each day - did you get a migraine, plus tags for other triggers (diet, sleep, stress etc) and notes
- shows migraine days vs non migraine days so you can kinda see your own pattern
- can export your logs as csv (for training a real model later maybe, see v2 folder in the old web version)

Everyone's data is separate per phone (signed in anonymously, no accounts).

## setup

1. `npm install` (probably already done)

2. make a Firebase project (separate one, don't reuse an existing project since this has health data)
   - console.firebase.google.com -> new project
   - add a Web app to it even tho its mobile, firebase JS sdk needs the web config

3. turn on Anonymous auth: Authentication -> Sign-in method -> Anonymous -> enable

4. make a Firestore database (any region)

5. paste `firestore.rules` into the Rules tab in Firestore and publish it

6. copy `.env.example` to `.env` and fill in the config values from step 2

7. `npx expo start` and scan the QR with Expo Go, or press a/i for an emulator/simulator

## files

- `app/` - screens, using expo router so filename = route
- `lib/weather.ts` - open-meteo calls + risk score math
- `lib/triggers.ts` - list of trigger chips
- `lib/firebase.ts` - firebase setup + anonymous sign in
- `lib/logs.ts` - reading/writing logs in firestore
- `lib/user.ts` - stuff saved on the phone itself (location, hidden chips)
