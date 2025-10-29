import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { placeId } = await request.json();

    if (!placeId) {
      return NextResponse.json(
        { error: 'Place ID is required' },
        { status: 400 }
      );
    }

    const response = await fetch(
      `https://places.googleapis.com/v1/${placeId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
          'X-Goog-FieldMask': 'id,displayName,formattedAddress,addressComponents',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Google API error:', errorData);
      throw new Error('Failed to fetch place details');
    }

    const data = await response.json();
    
    // Extract address components
    const addressData = {
      city: '',
      state: '',
      country: '',
      zipCode: '',
      formattedAddress: data.formattedAddress || '',
    };

    if (data.addressComponents) {
      data.addressComponents.forEach((component: any) => {
        const types = component.types || [];

        if (types.includes('locality')) {
          addressData.city = component.longText || '';
        }
        if (types.includes('administrative_area_level_1')) {
          addressData.state = component.shortText || ''; // e.g., "CA"
        }
        if (types.includes('country')) {
          addressData.country = component.shortText || ''; // e.g., "US"
        }
        if (types.includes('postal_code')) {
          addressData.zipCode = component.longText || '';
        }
      });
    }

    return NextResponse.json(addressData);
  } catch (error) {
    console.error('Place details error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch place details' },
      { status: 500 }
    );
  }
}
