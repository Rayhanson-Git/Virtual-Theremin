# Virtual Theremin

<p align="center">
  <img src="https://github.com/user-attachments/assets/d10c050e-1162-44af-9b22-730cf9c52225" alt="Virtual Theremin interface preview" width="900" />
</p>

<p align="center">
  A gesture-controlled instrument that turns your webcam into a futuristic performance space for vocals, bass, and drums.
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#controls">Controls</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#troubleshooting">Troubleshooting</a>
</p>

## Overview

Virtual Theremin is a browser-based musical instrument built with React, TypeScript, MediaPipe, Three.js, and Tone.js. It tracks both hands through your webcam and translates motion into expressive sound and visuals in real time.

This project blends:

- **Hand tracking** for gesture-based input
- **Realtime synthesis** for vocal and bass layers
- **Drum triggering** through finger taps
- **3D visuals** that respond to your performance

## Features

- **Gesture-driven performance** using live webcam input
- **Theremin-style vocal control** mapped to hand rotation
- **Dynamic bass layer** that follows the same performance gesture
- **Finger-tap drum hits** for kick, snare, hi-hat, and clap
- **Built-in music player** for loading your own audio file
- **Immersive visual feedback** powered by Three.js
- **Modern frontend stack** with Vite, React, and Tailwind CSS

## Controls

| Gesture | Result |
| --- | --- |
| **Left hand pinch** | Controls volume |
| **Right hand rotation** | Changes the vocal note and bass intensity |
| **Right thumb + index tap** | Triggers **kick** |
| **Right thumb + middle tap** | Triggers **snare** |
| **Right thumb + ring tap** | Triggers **hi-hat** |
| **Right thumb + pinky tap** | Triggers **clap** |
| **Loaded song volume** | Follows the current left-hand volume gesture |

## Getting Started

### Prerequisites

- **Node.js 18+**
- A modern browser with webcam support
- Camera and audio permissions enabled

### Installation

```bash
npm install
```

### Run locally

```bash
npm run dev
```

Then open the local Vite URL shown in your terminal.

### Production build

```bash
npm run build
```

### Preview the production build

```bash
npm run preview
```

## Available Scripts

```bash
npm run dev        # start the development server
npm run build      # create a production build
npm run preview    # preview the production build locally
npm run lint       # run ESLint
npm run typecheck  # run TypeScript checks
```

## Tech Stack

- **React 18**
- **TypeScript**
- **Vite**
- **Tailwind CSS**
- **Tone.js**
- **Three.js**
- **MediaPipe Tasks Vision**

## How It Works

The app initializes your webcam, detects both hands with MediaPipe, maps gesture data into musical parameters, and feeds those values into Tone.js synthesizers and drum players. At the same time, a Three.js scene visualizes the performance so the experience feels like an instrument rather than a demo.

Key implementation areas:

- `src/components/VirtualTheremin.tsx` — orchestration of UI, camera, hand tracking, and audio state
- `src/services/handTracking.ts` — gesture extraction and tap detection
- `src/services/audioSynthesis.ts` — vocal and bass synthesis
- `src/services/drumSynthesis.ts` — drum sample triggering

## Troubleshooting

- **No sound?** Click **Start Audio Experience** and make sure your browser allows audio playback.
- **Camera not working?** Grant webcam permission and check that no other app is locking the camera.
- **Gesture tracking feels unstable?** Use good lighting and keep both hands clearly visible in frame.
- **Performance feels heavy?** Close other GPU-intensive apps or browser tabs.

## Why this project is fun

Virtual Theremin sits somewhere between instrument, creative coding experiment, and interactive art piece. It is a great starting point if you want to explore webcam-based interfaces, audio synthesis on the web, or immersive frontend experiences.
