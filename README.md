# Kundli Analysis - Home Page

A minimalistic home page for Kundli (Vedic Astrology) analysis application.

## Features

- Clean and modern UI with gradient background
- Date of birth input
- Time of birth input (optional)
- Place of birth searchable dropdown (with dynamic city search via API)
- FreeAstrologyAPI integration for real-time Kundli calculations
- Smooth animations and transitions
- Responsive design for mobile and desktop
- Loading state animation
- Result display area with formatted JSON response

## Getting Started

1. Clone or download this repository
2. Open `index.html` in your web browser to view the page

## Configure FreeAstrologyAPI

Your API key is already configured! The app uses the `horoscope-chart-svg-code` endpoint from [FreeAstrologyAPI](https://freeastrologyapi.com/api-reference/horoscope-chart-svg-code) which generates:

- **SVG Horoscope Chart** - Visual birth chart with planetary positions
- **Complete Kundli data** - Detailed astrological calculations

### Current Configuration:
- **Endpoint:** `https://json.freeastrologyapi.com/horoscope-chart-svg-code`
- **API Key:** Already configured in `script.js`
- **Response Format:** SVG code for display + detailed astrology data

### What the API Returns:
1. Visual SVG chart of the horoscope (Rasi chart)
2. Planetary positions and their houses
3. Additional astrological calculations

The app will display the SVG chart and allow you to view the full JSON response in a collapsible details section.

## File Structure

```
kundli-app/
├── index.html      # Main HTML structure
├── styles.css      # CSS styling
├── script.js       # JavaScript for form handling
└── README.md       # This file
```

## Features Implemented

- ✅ Dynamic city search via Open-Meteo Geocoding API
- ✅ FreeAstrologyAPI integration for Kundli calculations
- ✅ Automatic coordinate fetching for accurate birth place
- ✅ Timezone calculation from longitude
- ✅ Error handling with user-friendly messages

## Future Enhancements

- Chart visualization
- Detailed horoscope readings
- PDF export functionality
- User authentication and saved charts
- Beautify the API response display

## Technologies Used

- HTML5
- CSS3 (with modern features like gradients, animations)
- Vanilla JavaScript (ES6+)
- Open-Meteo Geocoding API (for city search)
- FreeAstrologyAPI (for Kundli calculations)

## Design

The design follows a minimalistic approach with:
- Clean typography using system fonts
- Gradient purple/violet color scheme
- Smooth transitions and micro-interactions
- Card-based layout with shadow effects
- Mobile-responsive design
