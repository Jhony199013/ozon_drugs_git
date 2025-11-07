"use client";

import { useState, useEffect, useRef } from "react";
import { supabase, Drug } from "@/lib/api/supabase";

interface DrugSearchInputProps {
  value: string;
  onChange: (value: string, selectedDrug?: Drug) => void;
  placeholder: string;
  label: string;
}

export default function DrugSearchInput({ value, onChange, placeholder, label }: DrugSearchInputProps) {
  const [searchResults, setSearchResults] = useState<Drug[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const searchDrugs = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('drugs')
        .select('*')
        .or(`commercialName.ilike.${query}%,mnnName.ilike.${query}%`)
        .not('drug_Interactions', 'is', null)
        .limit(10);

      if (error) {
        console.error('Error searching drugs:', error);
        setSearchResults([]);
      } else {
        // Дополнительная фильтрация на клиенте для пустых массивов и строк
        const filteredData = (data || []).filter((drug: any) => {
          const interactions = drug.drug_Interactions;
          if (!interactions) return false;
          if (Array.isArray(interactions)) return interactions.length > 0;
          if (typeof interactions === 'string') return interactions.trim().length > 0;
          return true;
        });
        setSearchResults(filteredData);
      }
    } catch (error) {
      console.error('Error searching drugs:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchDrugs(value);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setIsOpen(true);
  };

  const handleSelectDrug = (drug: Drug) => {
    // Определяем, по какому полю искали (с начала строки)
    const query = value.toLowerCase();
    const commercialName = drug.commercialName || "";
    const mnnName = drug.mnnName || "";
    const isCommercialMatch = commercialName.toLowerCase().startsWith(query);
    const selectedName = isCommercialMatch ? commercialName : mnnName;
    
    onChange(selectedName, drug);
    setIsOpen(false);
  };

  const getDisplayName = (drug: Drug) => {
    const query = value.toLowerCase();
    const commercialName = drug.commercialName || "";
    const mnnName = drug.mnnName || "";
    const isCommercialMatch = commercialName.toLowerCase().startsWith(query);
    return isCommercialMatch ? commercialName : mnnName;
  };

  // Подсветка введённого текста в названии
  const highlightMatch = (text: string | null | undefined) => {
    if (!text) return "";
    const q = value.trim();
    if (!q) return text;
    const lcText = text.toLowerCase();
    const lcQ = q.toLowerCase();
    const idx = lcText.indexOf(lcQ);
    if (idx === -1) return text;
    const before = text.slice(0, idx);
    const match = text.slice(idx, idx + q.length);
    const after = text.slice(idx + q.length);
    return (
      <>
        {before}
        <span className="bg-yellow-200 text-gray-900">{match}</span>
        {after}
      </>
    );
  };

  const getTypeLabel = (drug: Drug) => {
    const query = value.toLowerCase();
    const commercialName = drug.commercialName || "";
    const isCommercialMatch = commercialName.toLowerCase().startsWith(query);
    return isCommercialMatch ? 'ТН' : 'МНН';
  };

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        className="w-full p-3 bg-white border-[1.5px] border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
      />
      
      {isOpen && (searchResults.length > 0 || loading || value.length >= 2) && (
        <div
          ref={dropdownRef}
          className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto"
        >
          {loading && searchResults.length === 0 ? (
            <div className="p-3 text-center text-gray-500">
              Поиск...
            </div>
          ) : (
            <>
              {searchResults.map((drug) => (
                <div
                  key={drug.id}
                  onClick={() => handleSelectDrug(drug)}
                  className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-bold text-gray-900">
                        {highlightMatch(getDisplayName(drug))}
                      </div>
                      {drug.active_Substance && (
                        <div className="text-sm text-gray-600 mt-1">
                          {(() => {
                            const substance = String(drug.active_Substance);
                            return substance.charAt(0).toUpperCase() + substance.slice(1).toLowerCase();
                          })()}
                        </div>
                      )}
                      {drug.owner && (
                        <div className="text-xs text-gray-500 mt-1">
                          {drug.owner}
                        </div>
                      )}
                    </div>
                    <div className="ml-3 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {getTypeLabel(drug)}
                    </div>
                  </div>
                </div>
              ))}
              {loading && searchResults.length > 0 && (
                <div className="p-2 text-center text-xs text-gray-400 border-t border-gray-100">
                  Обновление...
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}


