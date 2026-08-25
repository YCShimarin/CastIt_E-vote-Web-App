# CastIt - Online E-Voting System Template

Welcome to **CastIt**, a fast, modern, and easily deployable online e-voting system template. Perfect for organizational elections, student councils (BEM), or community polling.

## ✨ Key Features

* **Modern & Responsive UI:** Elegant, mobile-friendly interface with modern micro-animations.
* **Hassle-free Database System:** Uses **NeDB** (embedded NoSQL). Data is automatically stored in local `.db` files. No MySQL or MongoDB setup required.
* **Role-Based Access Control:** Features **Super Admin** (full access) and **Admin Verificator** (limited access restricted to specific departments/categories).
* **Live Vote Standings:** Real-time vote tally visualization using Pie Charts (Chart.js).
* **Helpdesk & Feedback System:** Voters can send questions or issues directly to admins, who can reply in real-time.
* **Export to Excel:** Export voting results and voter data to `.xlsx` files with a single click.
* **Security System:** Queue validation to prevent double-voting, and session limits (prevents login on multiple devices simultaneously).
* **Factory Reset:** A dedicated button to wipe the entire database clean with one click when you are ready to go live.

---

## 🛠️ Tech Stack

* **Frontend:** HTML5, Vanilla CSS3 (Custom Variables), Vanilla JavaScript (ES6 Modules)
* **Backend:** Node.js, Express.js
* **Database:** NeDB (Node Embedded Database)
* **Additional Libraries:** Chart.js (Charts), SheetJS (Excel Export), FontAwesome (Icons)

---

## 🚀 Installation & Setup

1. Ensure **Node.js** is installed on your computer.
2. Open your terminal/Command Prompt and navigate to the `functions/` directory.
3. Install all dependencies:
   ```bash
   npm install
   ```
4. Once the installation is complete, start the server:
   ```bash
   npm run dev
   ```
   *(Or use `npm start` if running in a production environment)*
5. Open your browser and go to: **`http://localhost:3000`**

---

## 🔐 Default Credentials (Dummy Data)

Use the following accounts to explore the features inside the application.

### Admin Accounts
| Role | Username | Password | Description |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin` | `LeMineralAdaManisManisnya` | Full access to all settings |
| **Verificator 1** | `admin1` | `password123` | Manages users in Category 1 |
| **Verificator 2** | `admin2` | `password456` | Manages users in Category 2 |

### Dummy Voter Accounts
There are 10 dummy voter accounts registered. You can log in using any of the usernames below with the **Password:** `password123`
* `jsmith` (Has already voted)
* `ejohnson`
* `mbrown`
* `jwilliams`
* `djones`
* And more...

---

## ⚠️ Production Preparation (Very Important)

This template comes with **dummy data** pre-installed so you can see what the system looks like out-of-the-box (e.g., pre-filled charts and user tables).

**IF YOU ARE READY TO USE THIS FOR A REAL ELECTION:**
1. Log in using the **Super Admin** account.
2. Navigate to the **Admin Panel**.
3. Scroll down to the **⚡ Quick Actions** section.
4. Click the red **Factory Reset** button.
5. Type `RESET` in the prompt dialog that appears.
6. The system will automatically delete *all* dummy users, voting history, feedbacks, and log records.
7. The system is now **100% clean** and ready to be used for your real election!

---
*Built to facilitate efficient and transparent digital democracy.*
