# Temple Escape — First-Person Labyrinth Game

A first-person 3D escape-room game built from scratch with **Three.js**. The player is trapped inside a torch-lit temple and must explore a maze, recover five hidden artifacts, and unlock the exit door to escape. The project was developed as the final assignment for the *Sistemas Gráficos* (Computer Graphics) course at **Universidad de Granada** and showcases real-time rendering, procedural geometry, physically-based materials, and custom collision and interaction systems — all implemented directly on top of the Three.js core, without a game engine.

> **Note:** This project began from the base scaffolding (`MyScene` / renderer boilerplate and the course library set) provided by the *Sistemas Gráficos* teaching staff. The maze design, gameplay loop, artifacts, interaction system, collision handling, minimap, materials, animations, and every game mechanic described below are original work.

---

## Overview

The game drops the player at the entrance of a 10×10 temple maze rendered in first person. Scattered across the corridors are five artifacts — a **dagger**, a golden **scarab**, an explorer's **hat**, a **gem**, and a **key**. The exit door stays sealed until all five are in the player's inventory. A pressable button on the starting wall toggles a **"hard mode"** that cuts the ambient light and leaves the player navigating by torchlight alone.

Each artifact is a hand-modelled 3D object with its own materials and animations, and each was first prototyped in an isolated test scene before being integrated into the final game (see [Project Structure](#project-structure)).

---

## Gameplay

**Objective:** collect all five artifacts and open the exit door to escape the temple.

| Action | Control |
| --- | --- |
| Move | `W` `A` `S` `D` or arrow keys |
| Look around | Mouse (click the canvas to lock the pointer) |
| Interact — pick up artifact / press button / open door | Left mouse button |

**Rules and progression:**

- Artifacts are picked up by looking at them and clicking; each pickup updates the on-screen inventory panel.
- The **scarab is gated**: it cannot be taken until the dagger has been collected, adding a small ordering constraint to the run.
- The **exit door only opens once all five artifacts are collected** — clicking the knob earlier shows the remaining count.
- The **button on the starting wall toggles hard mode**, disabling ambient light so only the camera-mounted spotlight illuminates the maze.
- A **minimap** in the bottom-right corner gives a top-down orthographic view of the maze to help with orientation.

---

## Technical Highlights

The game is implemented directly on the Three.js core, so most of the systems below were written by hand rather than pulled from an engine:

- **First-person controller with raycast collision.** Movement uses `PointerLockControls` and is fully frame-rate independent (`displacement = velocity · Δt`). Collisions are resolved by casting rays at three body heights across eight directions to approximate a cylindrical body volume, with per-axis (X then Z) resolution so the player *slides* along walls instead of sticking. The frame delta is clamped and the motion is sub-stepped to prevent tunneling through walls at high speed.
- **Dual-viewport rendering.** The scene is drawn twice per frame with scissored viewports: a full-screen perspective camera for the first-person view, plus a top-down **orthographic minimap** that auto-fits the maze bounds.
- **Raycast-based interaction.** A single screen-center raycaster (capped at ~2.5 m) handles all interaction — picking up artifacts, pressing the button, and opening the door — by testing against tagged meshes.
- **Physically-based materials and lighting.** Stone walls and floor use tiled colour + normal maps (`MeshStandardMaterial`); the gem is a `MeshPhysicalMaterial` with transmission, IOR, and clearcoat for a realistic glass look. A camera-mounted spotlight acts as the player's torch, with soft (PCF) shadow mapping.
- **Constructive Solid Geometry.** The gem's faceted shape is generated with CSG boolean operations (`three-bvh-csg`) rather than a static mesh.
- **Procedural character animation.** The scarab is fully procedural: articulated legs driven by an alternating-tripod gait, opening/closing wings, and an internal point light, all animated on a `Δt` clock so timing is independent of frame rate.
- **Game state and inventory.** An HTML overlay tracks collected artifacts, with gating logic (dagger → scarab) and a win condition tied to the exit door.

---

## Technology Stack

- **Language:** JavaScript (ES Modules)
- **Rendering:** [Three.js](https://threejs.org/) (core module, loaded via import maps)
- **Key libraries:** `PointerLockControls`, `three-bvh-csg` (CSG), `three-mesh-bvh`, `dat.GUI`
- **Techniques:** PBR materials, normal mapping, soft shadow maps, raycasting (collision + picking), CSG, procedural animation, multi-viewport rendering
- **Tooling:** Python's built-in HTTP server for local hosting (ES modules require serving over HTTP)

---

## Project Structure

```
.
├── juego/              # Final integrated game (entry point)
│   ├── index.html
│   ├── MyScene.js      # Scene facade: cameras, lights, game loop, collisions, interaction
│   ├── Laberinto.js    # Maze: tile map, walls, floor, materials
│   ├── Daga.js  Escarabajo.js  Sombrero.js  Gema.js  Llave.js
│   ├── Puerta.js       # Animated exit door
│   └── Boton.js        # Hard-mode toggle button
│
├── daga/ escarabajo/ sombrero/ gema/ llave/   # Isolated test scenes per artifact
├── puerta/ boton/ laberinto/                  # Isolated test scenes per component
│
├── libs/               # Three.js core + course-provided library set
├── imgs/               # Textures (colour + normal maps)
├── models/             # External OBJ/MTL assets
└── server-launcher.py  # Local static server
```

Each artifact and component lives in its own folder with a standalone scene, which is how it was developed and tested before being wired into `juego/`.

---

## How to Run

ES modules must be served over HTTP (opening `index.html` directly from the file system will not work). Any static server does the job.

**Option 1 — provided launcher**

```bash
python server-launcher.py
```

Then open <http://localhost:8000/juego/> in your browser.

**Option 2 — Python's built-in server**

```bash
python -m http.server 8000
```

Then open <http://localhost:8000/juego/>.

Click the canvas to lock the mouse pointer and start playing. Press `Esc` to release the pointer.

> **Tip:** each artifact and component can also be viewed in isolation by opening its own folder, e.g. <http://localhost:8000/gema/> or <http://localhost:8000/escarabajo/>.

---

## Future Work

- **Gameplay demo.** Add a *Gameplay Demo* section with short GIFs / videos of a full escape run and of individual artifact pickups (gem, scarab), plus the hard-mode toggle.

---

## Academic Context & Disclaimer

- This project was completed for the **Sistemas Gráficos** course (Double Degree in Computer Science and Mathematics, Universidad de Granada).
- The **base scaffolding** (`MyScene`/renderer boilerplate) and the **library set** under `libs/` were provided by the course teaching staff.
- The **maze design, gameplay, artifacts, animations, collision and interaction systems, minimap, materials, and all game logic** are original student work, unless otherwise stated.

---

## Authors

**David Kessler Martínez**
Double Degree in Computer Science and Mathematics — Universidad de Granada

**Álvaro Javier Ramos Jiménez**
Double Degree in Computer Science and Mathematics — Universidad de Granada
🔗 [github.com/alvaroramosjmz](https://github.com/alvaroramosjmz)


---

## License

This project is licensed under the **MIT License**. See [`LICENSE`](LICENSE) for details.
