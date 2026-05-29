# Milestone 3 - Running the Project

> 💡 **Quick Note**: Want to see the project in action immediately? Just visit our live website: **[https://uncharted-delhi.netlify.app/](https://uncharted-delhi.netlify.app/)**
> The instructions below are for running the project **locally on your machine**. This is useful if you want to develop, modify code, or test changes.

## Project Overview

This is a data visualization project for the Delhi Metro Network. The project consists of:

- **Frontend**: A Vite-based web application using D3 and Leaflet for interactive visualizations
- **Data Processing**: Python scripts and Jupyter notebooks for data cleaning and exploration

---

## Prerequisites

Before running this project, ensure you have the following installed:

- **Node.js** (v16 or higher) - [Download](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Python** (v3.8 or higher) - [Download](https://www.python.org/) - *Optional, only if you need to run data processing scripts*

---

## Installation & Setup

### Step 1: Install Node.js Dependencies

Install the required npm packages:

```bash
npm install
```

This will install the following dependencies:

- **Vite** (^6.0.0) - Build tool and dev server
- **D3** (^7.9.0) - Data visualization library
- **Leaflet** (^1.9.4) - Interactive mapping library

### Step 2: Install Python Dependencies (Optional)

If you need to run the data processing scripts and Jupyter notebooks:

```bash
# Navigate to the project root
cd ..

# Create a virtual environment (recommended)
python3 -m venv .venv

# Activate the virtual environment
# On macOS/Linux:
source .venv/bin/activate
# On Windows:
.venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt
```

The Python dependencies include:

- **Jupyter** - Interactive notebooks for data exploration
- **Pandas** - Data manipulation and analysis
- **NumPy** - Numerical computing
- **Matplotlib & Seaborn** - Data visualization
- **Requests & BeautifulSoup4** - Web scraping for data collection

---

## Running the Project

### Development Server

To run the interactive development server with hot reload:

```bash
npm run dev
```

This will:

- Start a local development server (typically at `http://localhost:5173`)
- Automatically open the project in your default browser
- Enable hot module reloading for instant updates as you modify code

### Production Build

To create an optimized production build:

```bash
npm run build
```

The output will be in the `dist/` directory, ready for deployment.

### Preview Production Build

To preview the production build locally:

```bash
npm run preview
```

---

## Project Structure

```
unCharted/
├── website/                    # Main web application (you are here)
│   ├── src/
│   │   ├── main.js            # Entry point
│   │   ├── map.js             # Map initialization
│   │   ├── timeline.js        # Timeline functionality
│   │   ├── station-modal.js   # Station details modal
│   │   ├── data-loader.js     # Data loading utilities
│   │   └── style.css          # Styles
│   ├── public/                # Static assets
│   ├── index.html             # Main HTML file
│   ├── package.json           # NPM dependencies
│   └── vite.config.js         # Vite configuration
├── data/                       # Data files (CSV format)
├── scripts/                    # Utility scripts
└── wikidata_scraping.ipynb    # Data scraping notebook
```

---

## Available Scripts

From the current directory:

| Command           | Description                              |
| ----------------- | ---------------------------------------- |
| `npm run dev`     | Start development server with hot reload |
| `npm run build`   | Build optimized production version       |
| `npm run preview` | Preview production build locally         |

---

## Data Files

The project uses several CSV files located in the `../data/` directory:

- `delhi-metro-stations.csv` - Station information
- `line-stops.csv` - Metro line and station mappings
- `ridership-yearly.csv` - Historical ridership data

These files are automatically loaded by the frontend during development.

---

## Troubleshooting

### Port already in use

If port 5173 is already in use, Vite will automatically try the next available port.

### Module not found errors

Make sure you've run `npm install` to install all dependencies:

```bash
npm install
```

### Python package issues

If you encounter Python package issues, try upgrading pip:

```bash
pip install --upgrade pip
pip install -r ../requirements.txt
```

---

## Deployment

The built application (from `npm run build`) can be deployed to any static hosting service:

- **Netlify** (recommended - project is already deployed at [https://uncharted-delhi.netlify.app/](https://uncharted-delhi.netlify.app/))
- GitHub Pages
- Vercel
- AWS S3
- Any web server (Apache, Nginx, etc.)

---

## Notes

- The project uses **Vite** for fast development and optimized production builds
- All frontend dependencies are specified in `package.json`
- Python dependencies are only needed if you plan to modify or re-process the data
- The website is configured to work with relative paths (`base: './'`), making it suitable for deployment in subdirectories

---

For more information, see the main [README.md](../README.md)
