"use client";

import { useState } from "react";
import Image from "next/image";
import { Drug } from "@/lib/api/supabase";
import PdfViewer from "./PdfViewer";

interface DrugCardProps {
  drug: Drug;
  position: "top" | "bottom";
}

// Маппинг колонок БД на иконки и описания
const contraindicationIcons: Record<string, { icon: string; description: string }> = {
  ci_pregnancy: { icon: "pregnancy.png", description: "Беременность" },
  ci_pregnancy_t1: { icon: "pregnancy.png", description: "Беременность\n(I триместр)" },
  ci_pregnancy_t2: { icon: "pregnancy.png", description: "Беременность\n(II триместр)" },
  ci_pregnancy_t3: { icon: "pregnancy.png", description: "Беременность\n(III триместр)" },
  ci_breastfeeding: { icon: "breastfeeding.png", description: "Кормление\nгрудью" },
  ci_newborns: { icon: "newborns.png", description: "Новорожденные" },
  ci_children_under_1y: { icon: "children_under_1y.png", description: "Дети до\n1 года" },
  ci_children_under_3y: { icon: "children_under_3y.png", description: "Дети до\n3 лет" },
  ci_children_under_12y: { icon: "children_under_12y.png", description: "Дети до\n12 лет" },
  ci_children_under_18y: { icon: "children_under_18y.png", description: "Дети до\n18 лет" },
  ci_elderly: { icon: "elderly.png", description: "Пожилой\nвозраст" },
  ci_diabetes_mellitus: { icon: "diabetes_mellitus.png", description: "Сахарный\nдиабет" },
  ci_endocrine_disorders: { icon: "endocrine_disorders.png", description: "Эндокринные\nзаболевания" },
  ci_bronchial_asthma: { icon: "bronchial_asthma.png", description: "Бронхиальная\nастма" },
  ci_seizures_epilepsy: { icon: "seizures_epilepsy.png", description: "Судороги /\nЭпилепсия" },
  ci_gastrointestinal_diseases: { icon: "gastrointestinal_diseases.png", description: "Заболевания\nЖКТ" },
  ci_liver_diseases: { icon: "liver_diseases.png", description: "Заболевания\nпечени" },
  ci_hepatic_failure: { icon: "liver_diseases.png", description: "Печёночная\nнедостаточность" },
  ci_kidney_diseases: { icon: "kidney_diseases.png", description: "Заболевания\nпочек" },
  ci_renal_failure: { icon: "kidney_diseases.png", description: "Почечная\nнедостаточность" },
  ci_cardiovascular_diseases: { icon: "cardiovascular_diseases.png", description: "Болезни сердца\nи сосудов" },
  ci_heart_failure: { icon: "cardiovascular_diseases.png", description: "Сердечная\nнедостаточность" },
  ci_driving_and_machinery: { icon: "driving_and_machinery.png", description: "Управление\nтранспортом и\nмеханизмами" }
};

export default function DrugCard({ drug, position }: DrugCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [showInstruction, setShowInstruction] = useState(false);
  // Получаем противопоказания с группировкой по статусу
  const getContraindications = () => {
    const contraindicated: Array<{
      icon: string;
      description: string;
    }> = [];
    
    const caution: Array<{
      icon: string;
      description: string;
    }> = [];

    Object.entries(contraindicationIcons).forEach(([column, iconData]) => {
      const value = drug[column as keyof Drug] as string;
      if (value && value !== "Нет противопоказаний" && value.trim() !== "") {
        if (value === "Противопоказано") {
          contraindicated.push({
            icon: iconData.icon,
            description: iconData.description
          });
        } else if (value === "С осторожностью") {
          caution.push({
            icon: iconData.icon,
            description: iconData.description
          });
        }
      }
    });

    return { contraindicated, caution };
  };

  const contraindications = getContraindications();

  // Проверяем, есть ли инструкция
  const hasInstructions = (): boolean => {
    const instructions = drug.useInstructions;
    if (!instructions) return false;
    if (typeof instructions === 'string') {
      return instructions.trim().length > 0;
    }
    if (Array.isArray(instructions)) {
      return instructions.length > 0 && instructions.some((item: string) => String(item).trim().length > 0);
    }
    return false;
  };

  const hasInstructionsValue = hasInstructions();

  // Функция для форматирования действующих веществ
  // Разделяет слитно написанные слова по заглавным буквам и добавляет запятые с пробелами
  const formatActiveSubstance = (substance: string | undefined | null): string => {
    if (!substance) return "";
    
    // Преобразуем в строку на случай, если пришёл другой тип
    let substanceStr = String(substance);
    
    // Сначала разделяем строку по заглавным буквам (кроме первой)
    // Регулярное выражение: заглавная буква, перед которой есть строчная буква или цифра
    substanceStr = substanceStr.replace(/([а-яёa-z0-9])([А-ЯЁA-Z])/g, "$1, $2");
    
    // Затем нормализуем запятые: заменяем запятые без пробелов на запятые с пробелами
    // И убираем лишние пробелы вокруг запятых
    substanceStr = substanceStr.replace(/,\s*/g, ", ").trim();
    
    return substanceStr;
  };

  const handleOpenInstruction = () => {
    if (!hasInstructionsValue || !drug.url) {
      return;
    }
    setShowInstruction(true);
  };

  const handleCloseInstruction = () => {
    setShowInstruction(false);
  };

  // PDF viewer управляет загрузкой внутри себя

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-3 md:p-4 shadow-sm ${
      position === "top" ? "mb-4" : ""
    }`}>
      {/* Заголовок с кнопками */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <span className="text-base font-bold text-gray-600">Торговое название: </span>
          <span className="text-gray-900 font-medium break-words">{drug.commercialName}</span>
        </div>
        <div className="flex gap-2 relative">
          <button
            onClick={handleOpenInstruction}
            disabled={!hasInstructionsValue}
            className={`inline-flex items-center gap-1 px-3 py-1.5 text-white text-xs font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 ${
              hasInstructionsValue
                ? 'bg-[var(--blue-700)] hover:bg-[var(--blue-700)]/90 focus:ring-[var(--blue-700)]/50 cursor-pointer'
                : 'bg-[var(--neutral-400)] cursor-not-allowed opacity-60'
            }`}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Инструкция</span>
          </button>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="inline-flex items-center justify-between px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-lg hover:bg-primary/90 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50 min-w-[110px]"
          >
            <span className="flex-1 text-left">{showDetails ? "Скрыть" : "Подробнее"}</span>
            <svg 
              className={`w-3 h-3 flex-shrink-0 transition-transform duration-200 ${showDetails ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Основная информация */}
      <div className="space-y-1 mb-3">
        
        <div>
          <span className="text-base font-bold text-gray-600">МНН: </span>
          <span className="text-gray-900 break-words">{drug.mnnName}</span>
        </div>
        
        <div>
          <span className="text-base font-bold text-gray-600">Действующее вещество: </span>
          <span className="text-gray-900 break-words">{formatActiveSubstance(drug.active_Substance)}</span>
        </div>
        
        {/* Дополнительная информация */}
        {showDetails && (
          <div className="mt-2 space-y-1 text-sm text-gray-700">
            {drug.owner && (
              <div>
                <span className="text-base font-bold text-gray-600">Владелец: </span>
                <span className="text-gray-900 break-words">{drug.owner}</span>
              </div>
            )}
            
            {drug.pharmacotherapeuticGroups && (
              <div>
                <span className="text-base font-bold text-gray-600">Фармакотерапевтическая группа: </span>
                <span className="text-gray-900 break-words">{drug.pharmacotherapeuticGroups}</span>
              </div>
            )}
            
            {drug.siteAddresses && (
              <div>
                <span className="text-base font-bold text-gray-600">Адрес: </span>
                <span className="text-gray-900 break-words">{drug.siteAddresses}</span>
              </div>
            )}
            
            {drug.ownersCountry && (
              <div>
                <span className="text-base font-bold text-gray-600">Страна: </span>
                <span className="text-gray-900 break-words">{drug.ownersCountry}</span>
              </div>
            )}
            
            {drug.ruNumber && (
              <div>
                <span className="text-base font-bold text-gray-600">Номер регистрационного удостоверения: </span>
                <span className="text-gray-900 break-words">{drug.ruNumber}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Противопоказания с группировкой */}
      {(contraindications.contraindicated.length > 0 || contraindications.caution.length > 0) && (
        <div className="pt-2">
          {/* Цветные блоки статусов */}
          <div className="flex gap-2 mb-3">
            {contraindications.contraindicated.length > 0 && (
              <div className="bg-[var(--status-danger)] text-white px-3 py-1 rounded text-xs font-medium">
                Противопоказано
              </div>
            )}
            {contraindications.caution.length > 0 && (
              <div className="bg-[var(--status-warning)] text-white px-3 py-1 rounded text-xs font-medium">
                С осторожностью
              </div>
            )}
          </div>
          
          {/* Все иконки в ряд - сначала красные, потом желтые */}
          <div className="flex flex-wrap gap-4">
            {/* Противопоказано (красные иконки) */}
            {contraindications.contraindicated.map((item, index) => (
              <div key={`contraindicated-${index}`} className="flex flex-col items-center">
                <Image
                  src={`/icon_сontraindicated/${item.icon}`}
                  alt={item.description}
                  width={64}
                  height={64}
                  className="mb-1 w-14 h-14 sm:w-16 sm:h-16"
                  quality={85}
                />
                <span className="text-xs text-center text-gray-700 whitespace-pre-line">
                  {item.description}
                </span>
              </div>
            ))}
            
            {/* С осторожностью (желтые иконки) */}
            {contraindications.caution.map((item, index) => (
              <div key={`caution-${index}`} className="flex flex-col items-center">
                <Image
                  src={`/icon_caution/${item.icon}`}
                  alt={item.description}
                  width={64}
                  height={64}
                  className="mb-1 w-14 h-14 sm:w-16 sm:h-16"
                  quality={85}
                />
                <span className="text-xs text-center text-gray-700 whitespace-pre-line">
                  {item.description}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Попап с инструкцией */}
      {showInstruction && drug.url && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-[60] p-0 sm:p-4">
          <div className="bg-white rounded-none sm:rounded-lg shadow-xl w-full h-full sm:max-w-4xl sm:h-[80vh] flex flex-col">
            {/* Заголовок попапа */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Инструкция по применению: {drug.commercialName}
              </h3>
              <button
                onClick={handleCloseInstruction}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Контент с PDF */}
            <div className="flex-1 relative overflow-hidden">
              <PdfViewer url={drug.url} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


