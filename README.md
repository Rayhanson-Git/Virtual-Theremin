<div align="center">

# 🎵 Virtual Theremin

<img src="https://github.com/user-attachments/assets/d10c050e-1162-44af-9b22-730cf9c52225" alt="Virtual Theremin interface preview" width="900" />

**A futuristic, gesture-controlled instrument — no hardware required.**  
Turn your webcam into a real-time performance space for vocals, bass, and drums, powered entirely by your browser.

<br/>

![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Three.js](https://img.shields.io/badge/Three.js-0.181-black?style=for-the-badge&logo=threedotjs&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

<br/>

[✨ Features](#-features) •
[🎮 Controls](#-controls) •
[🚀 Getting Started](#-getting-started) •
[🧠 How It Works](#-how-it-works) •
[🛠 Tech Stack](#-tech-stack) •
[🔧 Troubleshooting](#-troubleshooting)

</div>

---

## ✨ Features

> Play music with nothing but your hands and a webcam.

| Feature | Description |
|---|---|
| 🖐 **Gesture-Driven Performance** | Real-time hand tracking via your webcam — no controllers, no latency |
| 🎤 **Theremin-Style Vocal Synth** | Right hand rotation maps to pitch and harmonic character |
| 🎸 **Dynamic Bass Layer** | Bass intensity follows the same gesture as the vocal synth |
| 🥁 **Finger-Tap Drums** | Individual fingers trigger kick, snare, hi-hat, and clap |
| 🎵 **Built-In Music Player** | Load your own audio file and blend it into your performance |
| 🌌 **3D Visual Feedback** | Live Three.js visualization that reacts to your every move |
| ⚡ **Zero Setup Instrument** | Runs entirely in the browser — nothing to install or configure |

---

## 🎮 Controls

> Two hands, infinite possibilities.

### 🤚 Left Hand

| Gesture | Action |
|---|---|
| **Pinch (thumb + index)** | Controls master volume for all instruments and the loaded song |

### ✋ Right Hand

| Gesture | Action |
|---|---|
| **Wrist rotation** | Changes the vocal pitch and bass intensity |
| **Thumb + index tap** | 🥁 Triggers **Kick** |
| **Thumb + middle tap** | 🪘 Triggers **Snare** |
| **Thumb + ring tap** | 🎶 Triggers **Hi-Hat** |
| **Thumb + pinky tap** | 👏 Triggers **Clap** |

> **Tip:** Keep both hands well-lit and clearly in frame for the most responsive tracking.

---

## 🚀 Getting Started

### Prerequisites

- **Node.js 18+**
- A modern browser (Chrome or Edge recommended) with webcam support
- Camera and audio permissions enabled in your browser

### 1 — Clone & Install

```bash
git clone https://github.com/Rayhanson-Git/Virtual-Theremin.git
cd Virtual-Theremin
npm install
```

### 2 — Run in Development

```bash
npm run dev
```

Open the local URL shown in your terminal (typically `http://localhost:5173`).

### 3 — Build for Production

```bash
npm run build
npm run preview   # preview the built output locally
```

### Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the development server with hot reload |
| `npm run build` | Create an optimized production build |
| `npm run preview` | Locally preview the production build |
| `npm run lint` | Run ESLint across the codebase |
| `npm run typecheck` | Run TypeScript type checking |

---

## 🧠 How It Works

```
Webcam Feed
    │
    ▼
MediaPipe Hand Tracking
    │  (landmark positions + wrist rotation)
    ▼
Gesture Extraction (src/services/handTracking.ts)
    │  (volume, pitch, tap events)
    ├──────────────────────────────────────┐
    ▼                                      ▼
Tone.js Synthesizers                  Three.js Scene
(audioSynthesis.ts + drumSynthesis.ts)  (VirtualTheremin.tsx)
    │                                      │
    ▼                                      ▼
  Sound 🎵                          Visuals 🌌
```

The app boots your webcam, runs MediaPipe's hand-landmark model at high frame rates, and maps each frame's gesture data to Tone.js synth parameters and drum triggers. Simultaneously, a Three.js scene reads the same data to drive the immersive 3D visualisation — so what you see and what you hear are always in sync.

### Key Source Files

| File | Responsibility |
|---|---|
| `src/components/VirtualTheremin.tsx` | Root orchestration — UI, camera lifecycle, audio/visual state |
| `src/services/handTracking.ts` | Gesture extraction, wrist-angle calculation, tap detection |
| `src/services/audioSynthesis.ts` | Vocal and bass synthesizer setup and parameter mapping |
| `src/services/drumSynthesis.ts` | Drum sample loading and trigger logic |

---

## 🛠 Tech Stack

| Technology | Role |
|---|---|
| [React 18](https://react.dev/) | UI framework and component model |
| [TypeScript 5](https://www.typescriptlang.org/) | Static typing across the whole codebase |
| [Vite 5](https://vitejs.dev/) | Lightning-fast dev server and build tool |
| [Tailwind CSS 3](https://tailwindcss.com/) | Utility-first styling |
| [Tone.js 15](https://tonejs.github.io/) | Web Audio synthesis and scheduling |
| [Three.js 0.181](https://threejs.org/) | 3D rendering and visual effects |
| [MediaPipe Tasks Vision](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker) | Real-time hand landmark detection |
| [Supabase JS](https://supabase.com/) | Optional backend / data layer |
| [Lucide React](https://lucide.dev/) | Icon set |

---

## 🔧 Troubleshooting

| Problem | Solution |
|---|---|
| **No sound** | Click **Start Audio Experience** — browsers require a user gesture before playing audio |
| **Camera not working** | Grant webcam permission in your browser settings; ensure no other app is locking the camera |
| **Gesture tracking feels unstable** | Improve lighting, keep hands clearly visible in frame, and avoid busy backgrounds |
| **Performance feels sluggish** | Close other GPU-intensive apps or browser tabs; use a Chromium-based browser for best WebGL performance |
| **Build errors** | Make sure you are running Node.js 18 or later (`node -v`) |

---

## 💡 Why This Project Is Interesting

Virtual Theremin lives at the intersection of **creative coding**, **web audio**, and **computer vision** — three fields that rarely appear together in a single browser tab. Whether you are interested in gesture-based UIs, real-time audio synthesis, or immersive web experiences, this project is a rich starting point to explore all three.

---

<div align="center">

Made with ❤️ and a lot of hand-waving

</div>
