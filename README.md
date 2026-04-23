# KATUA Unand Voting System

Full-stack online voting system for the Alumni Organization of the Faculty of Engineering, Andalas University.

## Features
- Secure Login (bcrypt hashing)
- Single Vote Enforcement
- Real-time Dashboard Statistics
- Interactive Pie Chart (Chart.js)
- Professional Green/White Theme

## Tech Stack
- Frontend: HTML, CSS, Vanilla JS
- Backend: Node.js (Express)
- Storage: Local JSON files

## How to Run

### 1. Start the Backend
```bash
cd functions
npm install
node index.js
```
The backend will run on `http://localhost:3000`.

### 2. Start the Frontend
Simply open `public/index.html` in your browser.
(Note: You can use a local server like Live Server in VS Code for a better experience).

## Test Users
| Username | Password (username@nim) |
|----------|----------|
| fahmi    | fahmi@85171028 |
| andi     | andi@85171029 |
| siti     | siti@85171030 |

## Project Structure
```
/functions
  /data         - JSON storage
  /auth         - Login logic
  /routes       - Voting & Results logic
  /services     - Data abstraction
  /utils        - Helpers
/public
  /css          - Styling
  /js
    /components - UI Components
    /pages      - Page logic
    /utils      - API wrapper
```
