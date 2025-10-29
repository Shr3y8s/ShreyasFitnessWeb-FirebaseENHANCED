'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Loader2 } from 'lucide-react';

interface AddressData {
  street: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
}

interface AddressAutocompleteProps {
  onAddressSelect: (address: AddressData) => void;
  defaultValue?: string;
}

interface Suggestion {
  placePrediction: {
    place: string;
    placeId: string;
    text: {
      text: string;
    };
    structuredFormat: {
      mainText: {
        text: string;
      };
      secondaryText: {
        text: string;
      };
    };
  };
}

export function AddressAutocomplete({ onAddressSelect }: AddressAutocompleteProps) {
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);
  const sessionToken = useRef(uuidv4());
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchSuggestions = useCallback(async (searchText: string) => {
    if (searchText.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/autocomplete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: searchText,
          sessionToken: sessionToken.current,
        }),
      });

      const data = await response.json();
      
      if (data.suggestions) {
        setSuggestions(data.suggestions);
      } else {
        setSuggestions([]);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounce the input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (input) {
        fetchSuggestions(input);
      } else {
        setSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [input, fetchSuggestions]);

  const handleSelect = async (suggestion: Suggestion) => {
    const selectedText = suggestion.placePrediction.text.text;
    setInput(selectedText);
    setSuggestions([]);
    setIsFetchingDetails(true);
    
    try {
      // Fetch full place details to get address components
      const response = await fetch('/api/place-details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          placeId: suggestion.placePrediction.place,
        }),
      });

      const addressData = await response.json();
      
      // Call the parent callback with extracted address data
      onAddressSelect({
        street: addressData.street || '',
        city: addressData.city || '',
        state: addressData.state || '',
        country: addressData.country || '',
        zipCode: addressData.zipCode || '',
      });
    } catch (error) {
      console.error('Error fetching place details:', error);
    } finally {
      setIsFetchingDetails(false);
      // Generate new session token after selection
      sessionToken.current = uuidv4();
      // Refocus input
      inputRef.current?.focus();
    }
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Start typing an address..."
          disabled={isFetchingDetails}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-gray-100 disabled:cursor-not-allowed"
        />

        {(isLoading || isFetchingDetails) && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        )}
      </div>

      {suggestions.length > 0 && !isFetchingDetails && (
        <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
          {suggestions.map((suggestion, index) => (
            <li
              key={index}
              onClick={() => handleSelect(suggestion)}
              className="px-4 py-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
            >
              <div className="font-medium text-gray-900">
                {suggestion.placePrediction.structuredFormat.mainText.text}
              </div>
              <div className="text-sm text-gray-600 mt-0.5">
                {suggestion.placePrediction.structuredFormat.secondaryText.text}
              </div>
            </li>
          ))}
        </ul>
      )}

      {input.length > 0 && input.length < 3 && (
        <p className="text-xs text-gray-500 mt-1">
          Type at least 3 characters to search
        </p>
      )}
    </div>
  );
}
