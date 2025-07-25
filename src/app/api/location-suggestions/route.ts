import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');

  if (!query || query.length < 3) {
    return NextResponse.json({ predictions: [] });
  }

  try {
    // In production, you would use Google Places API
    // const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
    // const response = await fetch(
    //   `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&types=address&components=country:in&key=${GOOGLE_API_KEY}`
    // );
    // const data = await response.json();
    // return NextResponse.json(data);

    // For now, return mock suggestions based on common Indian locations
    const mockSuggestions = [
      {
        place_id: "1",
        description: `${query}, Mumbai, Maharashtra`,
        structured_formatting: {
          main_text: query,
          secondary_text: "Mumbai, Maharashtra"
        }
      },
      {
        place_id: "2",
        description: `${query}, Delhi, Delhi`,
        structured_formatting: {
          main_text: query,
          secondary_text: "Delhi, Delhi"
        }
      },
      {
        place_id: "3",
        description: `${query}, Bangalore, Karnataka`,
        structured_formatting: {
          main_text: query,
          secondary_text: "Bangalore, Karnataka"
        }
      },
      {
        place_id: "4",
        description: `${query}, Chennai, Tamil Nadu`,
        structured_formatting: {
          main_text: query,
          secondary_text: "Chennai, Tamil Nadu"
        }
      },
      {
        place_id: "5",
        description: `${query}, Hyderabad, Telangana`,
        structured_formatting: {
          main_text: query,
          secondary_text: "Hyderabad, Telangana"
        }
      },
      {
        place_id: "6",
        description: `${query}, Pune, Maharashtra`,
        structured_formatting: {
          main_text: query,
          secondary_text: "Pune, Maharashtra"
        }
      },
      {
        place_id: "7",
        description: `${query}, Kolkata, West Bengal`,
        structured_formatting: {
          main_text: query,
          secondary_text: "Kolkata, West Bengal"
        }
      },
      {
        place_id: "8",
        description: `${query}, Ahmedabad, Gujarat`,
        structured_formatting: {
          main_text: query,
          secondary_text: "Ahmedabad, Gujarat"
        }
      },
      {
        place_id: "9",
        description: `${query}, Jaipur, Rajasthan`,
        structured_formatting: {
          main_text: query,
          secondary_text: "Jaipur, Rajasthan"
        }
      },
      {
        place_id: "10",
        description: `${query}, Lucknow, Uttar Pradesh`,
        structured_formatting: {
          main_text: query,
          secondary_text: "Lucknow, Uttar Pradesh"
        }
      },
      {
        place_id: "11",
        description: `${query}, Chandigarh, Chandigarh`,
        structured_formatting: {
          main_text: query,
          secondary_text: "Chandigarh, Chandigarh"
        }
      },
      {
        place_id: "12",
        description: `${query}, Indore, Madhya Pradesh`,
        structured_formatting: {
          main_text: query,
          secondary_text: "Indore, Madhya Pradesh"
        }
      }
    ];

    // Filter suggestions based on query
    const filteredSuggestions = mockSuggestions.filter(suggestion =>
      suggestion.description.toLowerCase().includes(query.toLowerCase())
    );

    return NextResponse.json({ predictions: filteredSuggestions });
  } catch (error) {
    console.error('Error fetching location suggestions:', error);
    return NextResponse.json({ predictions: [] }, { status: 500 });
  }
} 