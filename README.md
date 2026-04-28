# 📺 LG TV Automation — One Tap TV for Grandma

> “She just wants to watch her TV… not learn technology.”

This project started with a simple, real problem:

My grandma couldn’t use the TV remote anymore.
Opening apps, navigating menus, selecting channels — it was all too much.

So I built something simple:

> **One tap → TV plays her channel**

No confusion. No menus. No frustration.

---

## ❤️ What This Does

With a single trigger (phone shortcut / API / button), the system:

* Turns control into **one action**
* Opens SunNXT
* Navigates automatically
* Plays **Sun TV HD**

All without the user needing to understand how the TV works.

---

## 🎯 The Goal

This is not about automation.

This is about:

> Making technology invisible for someone who just wants comfort.

---

## 🧠 How It Works (Simple View)

```text
Tap button / shortcut
        ↓
Backend API (/play)
        ↓
TV control system
        ↓
SunNXT opens
        ↓
Navigation runs
        ↓
Sun TV starts playing
```

---

## 🏗️ Architecture (Technical)

```text
Trigger (Shortcut / API)
        ↓
Express Server
        ↓
Controller (playSunTV)
        ↓
Sequence Runner
        ↓
WebSocket Client (LG webOS)
        ↓
TV executes commands
```

---

## ⚙️ Tech Stack

* Node.js
* Express.js
* WebSocket (`ws`)
* LG webOS local API
* dotenv

---

## 📁 Project Structure

```bash
lg-tv-automation/
├── src/
│   ├── server.js
│   ├── controller/
│   │   ├── controller.js
│   │   └── sequence-runner.js
│   │
│   ├── infra/
│   │   └── tv-client.js
│   │
│   ├── config/
│   │   └── constants.js
│   │
│   └── utils/
│       ├── delay.js
│       └── logger.js
│
├── .env.example
├── package.json
└── README.md
```

---

## 🚀 Setup

### 1. Clone

```bash
git clone https://github.com/hrithikksham/LGTV-AI-Automation.git
cd lg-tv-automation
```

---

### 2. Install

```bash
npm install
```

---

### 3. Configure Environment

Create `.env`:

```env
TV_IP=192.168.1.10
PORT=3000
```

---

### 4. Run Server

```bash
npm run dev
```

---

## 📡 API

### POST `/play`

Triggers full automation:

```bash
curl -X POST http://localhost:3000/play
```

---

### GET `/health`

Check system status:

```bash
curl http://localhost:3000/health
```

---

## 📱 How Grandma Uses It

### Option 1 — Phone Shortcut (Recommended)

* Add a shortcut on phone:

```text
POST http://<your-ip>:3000/play
```

* Rename it:

```text
📺 PLAY TV
```

👉 One tap → done

---

### Option 2 — Phone Call (Advanced)

* Call → triggers API → TV plays

---

### Option 3 — Physical Button (Future)

* Press button → TV starts

---

## ⚠️ Important Notes

* TV and server must be on **same WiFi**
* First connection requires **manual pairing on TV**
* Timing is critical — delays are tuned for reliability
* UI changes in apps may require updating navigation sequence

---

## 🧠 Key Design Philosophy

This system is **not AI-driven**.

It is:

* Deterministic
* Predictable
* Reliable

Because for real users:

> **Consistency matters more than intelligence**

---

## 🚧 Limitations

* No direct API from SunNXT
* Uses UI navigation (can break if app layout changes)
* Requires local network setup

---

## 🔮 Future Improvements

* Voice trigger (“Play TV”)
* State detection (smart recovery)
* Multi-channel support
* Hardware button device
* Android TV integration (better control APIs)

---

## 🙌 Why This Matters

This isn’t just a project.

It’s about:

* Helping someone feel independent again
* Removing frustration from daily life
* Making technology adapt to humans — not the other way around

---

## 🧾 Final Thought

> If a system is too complex for the people who need it most, it has already failed.

This project tries to fix that — one tap at a time.

---
