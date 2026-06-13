# 🌦️ NIET Smart Weather Station

<img width="1439" height="691" alt="image" src="https://github.com/user-attachments/assets/ec3a26ea-ee60-4fa1-a319-792f971f05f2" />


<p align="center">
  <strong>Campus-Scale IoT Weather Monitoring System</strong><br>
  Real-Time Environmental Monitoring • IoT Sensors • Cloud Integration • Interactive Dashboard
</p>

---


## 🌐 Live Demo

👉 **Open Dashboard:** [https://signodes-weather-window.netlify.app](https://signodes-weather-window.netlify.app)


## 🚀 Live Deployment

🔗 **Dashboard:** https://signodes-weather-window.netlify.app

Access the real-time weather monitoring dashboard to view live environmental data collected from NIET campus sensor nodes.


# 🌦️ NIET Smart Weather Station

<p align="center">
  <strong>Campus-Scale IoT Weather Monitoring System</strong>
</p>

<p align="center">
  <a href="https://signodes-weather-window.netlify.app">🌐 Live Demo</a> •
  <a href="#features">✨ Features</a> •
  <a href="#installation">⚙️ Installation</a> •
  <a href="#architecture">🏗️ Architecture</a>
</p>


## 📖 Overview

The **NIET Smart Weather Station** is a campus-wide IoT-based environmental monitoring system designed to collect, process, and visualize real-time weather data from distributed sensor nodes across the NIET campus.

The project integrates **embedded hardware, cloud services, and a modern web dashboard** to provide accurate and continuous monitoring of environmental conditions such as temperature, humidity, atmospheric pressure, air quality, UV index, carbon monoxide levels, and rainfall status.

This project demonstrates the seamless integration of **IoT, Embedded Systems, Cloud Computing, and Full-Stack Web Development** into a single smart infrastructure solution.

---

## 🚀 Key Features

### 📡 Real-Time Monitoring

* Live weather updates from deployed sensor nodes
* Automatic data refresh every 5 minutes
* Continuous environmental tracking

### 🌍 Multi-Sensor Data Collection

* Temperature Monitoring
* Humidity Monitoring
* Atmospheric Pressure Monitoring
* PM2.5 Air Quality Monitoring
* PM10 Air Quality Monitoring
* UV Index Measurement
* Carbon Monoxide Detection
* Rainfall Detection

### 📊 Interactive Dashboard

* Clean and responsive user interface
* Dark Mode / Light Mode support
* Mobile, Tablet, and Desktop compatibility
* Real-time visualization of environmental parameters

### 🔗 Smart Node Management

* Online/Offline Node Status Detection
* Last Active Timestamp Tracking
* Network Health Monitoring

### 🛡️ Reliability & Security

* Type-Safe Architecture using TypeScript
* Environment-Based Configuration
* CORS Protection
* Data Validation
* Automatic Retry Mechanism
* Request Timeout Handling

---

# 🏗️ System Architecture

```text
┌───────────────────┐
│ Environmental     │
│ Sensors           │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ ESP8266 / ESP32   │
│ Sensor Nodes      │
└─────────┬─────────┘
          │ WiFi
          ▼
┌───────────────────┐
│ Google Apps Script│
│ API Layer         │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ Google Sheets     │
│ Data Storage      │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ React Dashboard   │
│ Visualization     │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ End Users         │
└───────────────────┘
```

---

# 🔌 Hardware Components

| Component           | Purpose                           |
| ------------------- | --------------------------------- |
| ESP8266 / ESP32     | Main Microcontroller              |
| DHT22               | Temperature & Humidity Monitoring |
| BMP280              | Atmospheric Pressure Monitoring   |
| MQ Series Sensor    | Air Quality & Gas Detection       |
| UV Sensor           | UV Index Monitoring               |
| Rain Sensor         | Rainfall Detection                |
| WiFi Module         | Wireless Data Transmission        |
| Power Supply Module | Stable Power Management           |

---

# 📊 Parameters Monitored

| Parameter            | Unit     |
| -------------------- | -------- |
| Temperature          | °C       |
| Humidity             | %        |
| Atmospheric Pressure | hPa      |
| PM2.5                | µg/m³    |
| PM10                 | µg/m³    |
| UV Index             | Index    |
| Carbon Monoxide      | ppm      |
| Rainfall Status      | Yes / No |

---

# 💻 Technology Stack

## Frontend

* React.js
* TypeScript
* Vite
* Tailwind CSS
* Context API

## Backend

* Node.js
* Express.js
* Google Apps Script

## Database

* Google Sheets

## IoT Layer

* ESP8266 / ESP32
* Embedded C++
* WiFi Communication

---

# 📂 Project Structure

```text
src/
├── components/
│   ├── common/
│   ├── dashboard/
│   ├── analytics/
│   ├── map/
│   └── heroui/
│
├── context/
├── pages/
├── services/
├── config/
├── utils/
├── hooks/
└── lib/
```

---

# 📈 Dashboard Features

### Weather Monitoring

* Live Temperature Tracking
* Live Humidity Tracking
* Atmospheric Pressure Visualization
* Rainfall Status Monitoring

### Air Quality Analytics

* PM2.5 Monitoring
* PM10 Monitoring
* Carbon Monoxide Detection
* UV Risk Analysis

### Smart Visualization

* Interactive UI Components
* Real-Time Data Representation
* Responsive Analytics Dashboard

### Device Monitoring

* Node Status Monitoring
* Last Updated Tracking
* Connection Health Monitoring

---

# 🔄 Data Flow

```text
Sensor Reading
      ↓
Data Processing
      ↓
WiFi Transmission
      ↓
Google Apps Script API
      ↓
Google Sheets Storage
      ↓
Dashboard Data Fetching
      ↓
Real-Time Visualization
```

---

# ⚡ Performance

| Metric                | Value             |
| --------------------- | ----------------- |
| Data Refresh Interval | 5 Minutes         |
| Dashboard Load Time   | < 2 Seconds       |
| Update Frequency      | Real-Time Polling |
| Platform Availability | 24×7 Monitoring   |

---

# 🛠️ Installation

## Clone Repository

```bash
git clone https://github.com/buildwithshlok/NIET-Weather-Station.git

cd NIET-Weather-Station
```

## Install Dependencies

```bash
npm install
```

## Configure Environment Variables

Create a `.env` file:

```env
VITE_GOOGLE_SCRIPT_URL=YOUR_GOOGLE_SCRIPT_URL
```

## Start Development Server

```bash
npm run dev
```

Application will be available at:

```text
http://localhost:5173
```

---

# 🚀 Production Build

```bash
npm run build
```

Preview Production Build:

```bash
npm run preview
```

---

# 📷 Project Gallery

### Dashboard


<img width="1873" height="788" alt="image" src="https://github.com/user-attachments/assets/854b28ab-d216-431f-b98c-3cb9712545c3" />



### Hardware Node



<img width="1936" height="1352" alt="image" src="https://github.com/user-attachments/assets/23c94602-6c44-4e8a-aa76-a20c252ed83a" />



### Deployment Site


<img width="1873" height="788" alt="image" src="https://github.com/user-attachments/assets/0db0d57d-3a56-4589-85f5-c996cd5cfc12" />


---

# 🎯 Applications

* Smart Campus Infrastructure
* Environmental Monitoring
* Research & Data Analytics
* Pollution Tracking
* Smart City Solutions
* Educational IoT Demonstrations
* Weather Forecasting Research

---

# 🔮 Future Scope

* AI-Based Weather Prediction
* Historical Data Analytics
* Mobile Application Development
* SMS & Email Alerts
* MQTT-Based Communication
* Cloud Database Integration
* Machine Learning Forecast Models

---

# 👨‍💻 Developer

### Shlok Singh

Third-Year Engineering Student

**Domains Worked On**

* Internet of Things (IoT)
* Embedded Systems
* Full Stack Development
* Cloud Integration
* Environmental Monitoring Systems

---

# 🏆 Project Highlights

✅ End-to-End IoT Solution

✅ Hardware + Software Integration

✅ Real-Time Environmental Monitoring

✅ Cloud-Based Data Processing

✅ Interactive Analytics Dashboard

✅ Campus-Wide Deployment

✅ Research-Oriented Engineering Project

---

## ⭐ Support

If you found this project useful, consider giving it a **Star ⭐** on GitHub.

Your support motivates further development and improvements.
