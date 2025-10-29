import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { input, sessionToken } = await request.json();

    if (!input || input.length < 2) {
      return NextResponse.json({ suggestions: [] });
    }

    const response = await fetch(
      'https://places.googleapis.com/v1/places:autocomplete',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
        },
        body: JSON.stringify({
          input: input,
          sessionToken: sessionToken,
          includedRegionCodes: ['US'], // Restrict to US addresses
          languageCode: 'en',
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Google API error:', errorData);
      throw new Error('Failed to fetch autocomplete suggestions');
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Autocomplete error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch suggestions' },
      { status: 500 }
    );
  }
}
