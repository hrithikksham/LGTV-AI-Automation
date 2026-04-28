# 📺 LG webOS TV Automation — One Tap TV for Grandma

> “She just wants to watch her TV… not learn how it works.”

This started with something very real.

My grandma has a smart TV — an LG webOS TV.
But for her, it wasn’t “smart” at all.

Opening apps, navigating menus, selecting channels…
Every step required remembering buttons, directions, sequences.

It became frustrating.

So instead of teaching her technology, I changed the system.

> **Now she just taps one button on her phone → TV starts playing**

No remote. No confusion. No learning curve.

---

## ❤️ What This Does

With a single tap on her phone:

* Opens SunNXT
* Automatically navigates the UI
* Starts playing **Sun TV HD**

All without her needing to understand:

* remotes
* menus
* apps
* or “how smart TVs work”

---

## 🎯 The Goal

This is not about automation.

It’s about:

> **Removing friction from everyday life for someone who shouldn’t have to deal with it.**

Technology should adapt to people — not the other way around.

---

## 🧠 How It Works (Real Flow)

```text
Tap button on phone
        ↓
HTTP request sent to local server
        ↓
Backend API (/play)
        ↓
LG webOS WebSocket control
        ↓
SunNXT opens
        ↓
Navigation executes (LEFT → DOWN → OK → RIGHT → OK)
        ↓
Sun TV starts playing
```

---

## 🏗️ Architecture

```text
Phone Shortcut (HTTP Trigger)
        ↓
Express Server (/play)
        ↓
Controller (playSunTV)
        ↓
Sequence Runner (deterministic execution)
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
* LG webOS local control API
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
TV_IP=192.168.x.xx
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

Triggers the full automation flow:

```bash
curl -X POST http://localhost:3000/play
```

---

### GET `/health`

Check system readiness:

```bash
curl http://localhost:3000/health
```

---

## 📱 How Grandma Uses It (Actual UX)

### ✅ Phone Shortcut (Primary)

On her phone, there’s a single button:

```text
📺 PLAY TV
```

Behind the scenes:

```text
POST http://<your-local-ip>:3000/play
```

She taps it → TV starts.

That’s it.

---

### Optional Extensions

* 📞 Phone call trigger
* 🔘 Physical WiFi button
* 🗣️ Voice command

---

## ⚠️ Important Notes

* TV and server must be on the **same WiFi network**
* First connection requires **manual pairing on the TV**
* Timing is critical — delays are tuned for stability
* UI changes in apps may require updating navigation sequence

---

## 🧠 Design Philosophy

This system is **not AI-driven**.

It is:

* Deterministic
* Predictable
* Reliable

Because for real users:

> **Consistency beats intelligence.**

---

## 🚧 Limitations

* No official API from SunNXT
* Relies on UI navigation (can break if app layout changes)
* Requires local network setup

---

## 🔮 Future Improvements

* Voice trigger (“Play TV”)
* Smart state detection
* Multi-channel presets
* Dedicated hardware button
* Android TV support (stronger APIs)

---

## 🙌 Why This Matters

This is more than a project.

It’s about:

* Giving someone independence
* Removing daily frustration
* Making technology feel simple again

---

This is a small step toward fixing that —
one tap at a time.

---
