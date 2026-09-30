# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npm start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

## Native UI on each platform

The shared React code keeps the application state and navigation, while platform files render
native controls with SwiftUI on iOS and Jetpack Compose/Material 3 on Android.

The project uses Expo SDK 57, which includes the stable platform-specific `@expo/ui`
renderers in Expo Go. Native development builds are still required for custom modules,
such as Clerk's native Google sign-in and remote push notifications:

```bash
npm run android:native
npm run start:dev
```

Startup commands use Expo CLI directly. `npm start` explicitly selects Expo Go, so the
QR code uses an `exp://` link. Install Expo Go compatible with SDK 57 and connect the
phone and computer to the same network. Use `npm run start:tunnel` if LAN is inaccessible.
On a physical iPhone, sign in to the same Expo account in Expo Go and Expo CLI
(`npx expo login`). See [Expo Go sign-in requirements](https://docs.expo.dev/troubleshooting/expo-go-sign-in-required/).
After installing a native development build, use `npm run start:dev` or
`npm run android:dev` to connect to that build instead.

Real sign-in requires `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` in `.env.local`, copied from
the Clerk Dashboard's API keys page. Without it, development opens public screens as a
guest; login and private routes remain unavailable. Remote builds require this key.

After upgrading the SDK, rebuild previously installed development clients with
`npm run android:native`, or create a new EAS development build. SDK 54 clients
cannot load the SDK 57 JavaScript runtime. Native directories generated locally
must also be regenerated for SDK 57; Expo CLI's `prebuild` does this by default.

On macOS, use `npm run ios:native`. For a physical device or when building iOS from Windows, use
the existing EAS development profile:

```bash
eas build --profile development --platform android
eas build --profile development --platform ios
```

## Google sign-in on Android and iOS

CasaSeg uses native Google sign-in through Clerk's `@clerk/expo-google-signin` plugin in
development and store builds. Expo Go uses the browser OAuth flow instead; it cannot
load this custom native module.

Configure these public OAuth identifiers before rebuilding:

```bash
EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID=your-web-client.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your-ios-client.apps.googleusercontent.com
```

The iOS OAuth client must use bundle identifier `com.casaseg.mobile`. The app config derives and
registers its reversed URL scheme automatically. Android OAuth credentials must use package
`com.casaseg.mobile` and include every SHA-1 used by local, EAS and Google Play signing.

After changing either credential, rebuild the native client; restarting Metro is not enough.

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
