# Body Fat Tracker

A mobile-friendly web application for tracking body fat percentage using the US Navy method. Capture measurements and progress photos to monitor your fitness journey over time.

## Features

### Measurement Tracking
- **Profile Setup**: Choose between male/female and Imperial/Metric units
- **Body Measurements**: Input height, weight, neck, waist, and hip (females only) measurements
- **Photo Capture**: Take or upload front, side, and back progress photos using your device camera
- **Navy Method Calculation**: Accurate body fat calculation using the US Navy circumference method

### Progress Analysis
- **History View**: Browse all your past measurements with detailed data
- **Gallery by Body Fat %**: Organize your progress photos by body fat range
- **Compare Entries**: Side-by-side comparison of any two measurements to track progress
- **Data Export/Import**: Export all your data as JSON for backup or import previous data

### User Experience
- **Session-based**: Data persists during your session (export to save)
- **Mobile Optimized**: Responsive design works great on phones and tablets
- **Camera Integration**: Built-in camera support for capturing progress photos
- **Offline Capable**: Works entirely in the browser with no backend required

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/bahaeomid/BF-Estimator.git
cd BF-Estimator
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

### Building for Production

```bash
npm run build
```

The production-ready files will be in the `dist` folder.

## How to Use

### Taking Your First Measurement

1. Click **New Measurement** on the home screen
2. Select your sex (Male/Female) and measurement system (Imperial/Metric)
3. Enter your body measurements:
   - Height
   - Weight
   - Neck circumference (below Adam's apple)
   - Waist circumference (at navel level)
   - Hips circumference (females only, at widest point)
4. Capture or upload three progress photos:
   - Front view
   - Side view
   - Back view
5. Click **Calculate Body Fat %** to see your results

### Measurement Tips

For accurate measurements:
- Stand naturally, don't suck in your stomach
- Measure over bare skin, not clothing
- Keep the measuring tape level and snug but not tight
- Measure at the same time of day for consistency
- Use good, consistent lighting for photos

### Photo Guidelines

- Use the same spot with consistent lighting each time
- Stand naturally with arms at sides
- Wear fitted clothing or shirtless/sports bra
- Maintain the same distance from the camera
- Keep a neutral expression and relaxed posture

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **lucide-react** - Icons
- **Web APIs** - Camera, FileReader, Blob for client-side functionality

## Project Structure

```
BF-Estimator/
├── src/
│   ├── App.tsx           # Main application component
│   ├── main.tsx          # React entry point
│   ├── index.css         # Tailwind CSS imports
│   └── vite-env.d.ts     # Vite type definitions
├── index.html            # HTML entry point
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── vite.config.ts        # Vite configuration
├── tailwind.config.js    # Tailwind configuration
└── postcss.config.js     # PostCSS configuration
```

## Body Fat Calculation Method

This app uses the **US Navy Body Fat Calculator** method:

### For Males:
```
Body Fat % = 495 / (1.0324 - 0.19077 × log10(waist - neck) + 0.15456 × log10(height)) - 450
```

### For Females:
```
Body Fat % = 495 / (1.29579 - 0.35004 × log10(waist + hips - neck) + 0.22100 × log10(height)) - 450
```

Note: Measurements should be in the same units (all inches or all centimeters).

## Data Management

- **Export**: Click "Export Complete Data" to download all your measurements and photos as a JSON file
- **Import**: Use "Import Data" to restore previously exported data
- **Note**: Data is session-based. Always export your data before closing the browser to avoid losing it.

## Browser Compatibility

- Chrome 80+
- Firefox 75+
- Safari 14+
- Edge 80+

Camera features require a browser with `getUserMedia` support.

## License

MIT License - see LICENSE file for details.

## Acknowledgments

- US Navy body fat calculation method
- Built with React and Tailwind CSS
