# 🗳️ CastIt - Premium E-Voting System

Welcome to **CastIt**! This complete and secure electronic voting solution includes a modern voter frontend, a comprehensive admin dashboard, real-time analytics, and bulletproof data handling out of the box.

## 🌟 Key Features
- **Premium UI/UX:** Built with modern design principles (Glassmorphism, Dark/Light modes).
- **Comprehensive Admin Panel:** Manage users, verify registrants, and control voting status.
- **Enterprise Security:**
  - **Single-Device Login:** Prevents multiple concurrent logins using a secure Session & Heartbeat system.
  - **Anti-Spam Registration:** Validates double registrations (ID/Email) in real-time.
  - **Audit Logs:** Tracks every critical admin action.
- **Real-Time Analytics:** Interactive Doughnut chart for live vote counting.
- **Easy Customization:** Edit one `web_config.json` file to change logos, candidates, and website details instantly.

---

## 🚀 Installation Guide

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) (v16 or higher) installed on your system.

### 1. Extract the Files
Extract the downloaded `.zip` file into your desired folder.

### 2. Install Dependencies
Open your terminal/command prompt, navigate to the `functions` folder, and run:
```bash
cd functions
npm install
```

### 3. Start the Server
Start the backend server using the following command:
```bash
npm run dev
```
You should see a message in the terminal saying:
```text
=================================
  VOTING SERVER IS RUNNING
  Port: 3000
=================================
```

### 4. Access the Website
Open your browser and visit:
- **Voter Portal:** `http://localhost:3000/`
- **Admin Dashboard:** `http://localhost:3000/admin.html`

---

## 🛠️ Configuration & Setup

### Changing Website Identity & Candidates
You don't need to touch the code to update the website's content. Simply open the `web_config.json` file (located inside the `functions` folder). 
Here you can easily edit:
- Website Name, Title, and Description
- Admin & Verificator accounts
- List of Candidates (Names, Visions, Missions, and Image paths)

### Default Admin Login
To access the admin panel for the first time, use the credentials specified in your `web_config.json`. By default:
- **Username:** `admin1`
- **Password:** `password123`

*(Note: Always change these default credentials before going live!)*

---

## 📂 Project Structure
- `/public`: Contains all frontend assets (HTML, CSS, JS, Images).
- `/functions`: Contains the Node.js backend server.
- `/functions/web_config.json`: The brain of your UI configuration and admin credentials.
- `/functions/data`: The local NeDB databases where user data, logs, and votes are securely stored.

---

## 📝 License
By purchasing this template, you are granted a license to use this software in accordance with the terms provided on your Lemon Squeezy receipt. 

Thank you for your purchase! If you encounter any issues, please refer to our support portal.
