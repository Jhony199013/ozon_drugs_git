"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import DrugSearchInput from "@/components/ui/DrugSearchInput";
import DrugCard from "@/components/ui/DrugCard";
import { Drug, supabase } from "@/lib/api/supabase";
import { requestInteractionAnalysis } from "@/lib/api/webhook";
import ResultCard from "@/components/ui/ResultCard";
import ProgressBar from "@/components/ui/ProgressBar";
import ScrollToBottomButton from "@/components/ui/ScrollToBottomButton";

// Подсветка перенесена в утилиту '@/utils/highlight'

// Функция для генерации UUIDv5 (на основе MD5, без require)
function uuidv5FromString(input: string): string {
  // простая MD5 через встроенные средства
  const buffer = Buffer.from(input, 'utf8');
  let hash = 0;
  for (let i = 0; i < buffer.length; i++) {
    hash = (hash + buffer[i]) & 0xffffffff;
  }
  let hex = ('00000000' + hash.toString(16)).slice(-8);
  // дополняем до формата UUID
  return (
    hex.slice(0, 8) + '-' +
    hex.slice(0, 4) + '-' +
    '5' + hex.slice(1, 4) + '-' +
    'a' + hex.slice(2, 4) + '-' +
    hex.padEnd(12, '0')
  ).slice(0, 36);
}

export default function Home() {
  const [drug1, setDrug1] = useState("");
  const [drug2, setDrug2] = useState("");
  const [selectedDrug1, setSelectedDrug1] = useState<Drug | null>(null);
  const [selectedDrug2, setSelectedDrug2] = useState<Drug | null>(null);
  const [result, setResult] = useState("");
  const [explanation, setExplanation] = useState("");
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);
  const [showContraindications, setShowContraindications] = useState(false);
  // массивы из таблицы cache
  const [pairs, setPairs] = useState<string[]>([]);
  const [interactionsArr, setInteractionsArr] = useState<string[]>([]);
  const [explanationsArr, setExplanationsArr] = useState<string[]>([]);
  const [totalMs, setTotalMs] = useState(0);
  const [progressSessionId, setProgressSessionId] = useState(0);
  const [currentPairLabel, setCurrentPairLabel] = useState("");
  const [currentPairIndex, setCurrentPairIndex] = useState(1);

  // Парсим действующие вещества в массив (безопасно для любых типов)
  const parseActiveSubstances = (value?: unknown) => {
    if (!value) return [] as string[];
    if (Array.isArray(value)) {
      return value
        .map((v) => String(v).trim())
        .filter(Boolean);
    }
    const text = String(value);
    return text
      .split(/\+|,|;|\//g)
      .map((s) => s.trim())
      .filter(Boolean);
  };

  const substancePairs = useMemo(() => {
    const left = parseActiveSubstances(selectedDrug1?.active_Substance);
    const right = parseActiveSubstances(selectedDrug2?.active_Substance);
    const pairsLocal: string[] = [];
    const a = left.length ? left : [drug1 || "Препарат 1"];
    const b = right.length ? right : [drug2 || "Препарат 2"];
    for (const l of a) {
      for (const r of b) {
        pairsLocal.push(`${l} + ${r}`);
      }
    }
    return pairsLocal;
  }, [selectedDrug1, selectedDrug2, drug1, drug2]);

  // Управление таймлайном шагов (обновляем только метки пары и индекс)
  useEffect(() => {
    if (!polling) {
      setTotalMs(0);
      setCurrentPairLabel("");
      return;
    }

    const numPairs = Math.max(1, substancePairs.length);
    const durationsMs = Array.from({ length: numPairs }, (_, i) =>
      i === numPairs - 1 ? 10000 : 7000
    );
    const sum = durationsMs.reduce((a, b) => a + b, 0);
    setTotalMs(sum);

    let elapsedMs = 0;
    let idx = 0;
    let sliceEnd = durationsMs[0];
    setCurrentPairLabel(substancePairs[idx] || "Пара 1");
    setCurrentPairIndex(1);

    const interval = setInterval(() => {
      elapsedMs += 200;
      if (elapsedMs >= sliceEnd && idx < numPairs - 1) {
        idx += 1;
        sliceEnd += durationsMs[idx];
        setCurrentPairLabel(substancePairs[idx] || `Пара ${idx + 1}`);
        setCurrentPairIndex(idx + 1);
      }
    }, 200);

    return () => clearInterval(interval);
  }, [polling, substancePairs]);

  // Нормализатор: в массив строк
  const toStringArray = (value: unknown): string[] => {
    if (!value) return [];
    if (Array.isArray(value)) return value.map((v) => String(v));
    // если пришла строка JSON массива
    try {
      const parsed = JSON.parse(String(value));
      if (Array.isArray(parsed)) return parsed.map((v) => String(v));
    } catch (_e) {
      // игнорируем
    }
    // иначе одна строка
    return [String(value)];
  };

  const handleCalculate = async () => {
    if (selectedDrug1 && selectedDrug2) {
      setLoading(true);
      setPolling(false);
      setShowContraindications(true);
      
      try {
        // Генерируем токен из названий препаратов
        const drug1Name = drug1.trim().toLowerCase();
        const drug2Name = drug2.trim().toLowerCase();
        const sorted = [drug1Name, drug2Name].sort();
        const pairString = sorted.join('+');
        const token = uuidv5FromString(pairString);

        // Проверяем кэш
        const { data: cacheData, error: cacheError } = await supabase
          .from('cache')
          .select('interact, explanation, interact_list')
          .eq('cache_token', token)
          .single();

        if (cacheError && cacheError.code !== 'PGRST116') {
          console.error('Cache error:', cacheError);
          setResult("Ошибка при проверке кэша. Попробуйте еще раз.");
          setLoading(false);
          return;
        }

        if (cacheData) {
          // Результат найден в кэше
          setResult(String((cacheData as any).interact || ""));
          setExplanation(String((cacheData as any).explanation || ""));
          setPairs(toStringArray((cacheData as any).interact_list));
          setInteractionsArr(toStringArray((cacheData as any).interact));
          setExplanationsArr(toStringArray((cacheData as any).explanation));
          setLoading(false);
          return;
        }

        // Результата нет в кэше, отправляем запрос и начинаем опрос
        const webhookData = {
          drug1: {
            name: drug1,
            lpid: selectedDrug1.lpid,
            active_Substance: selectedDrug1.active_Substance
          },
          drug2: {
            name: drug2,
            lpid: selectedDrug2.lpid,
            active_Substance: selectedDrug2.active_Substance
          }
        };

        const ok = await requestInteractionAnalysis(webhookData);

          if (ok) {
          setResult("Загрузка взаимодействия");
          setLoading(false);
          setPolling(true);
            setProgressSessionId((v) => v + 1);
          startPolling(token);
        } else {
          setResult("Ошибка при отправке данных. Попробуйте еще раз.");
          setLoading(false);
        }
      } catch (error) {
        console.error('Error:', error);
        setResult("Ошибка при отправке данных. Проверьте подключение к интернету.");
        setLoading(false);
      }
    } else {
      setResult("Пожалуйста, выберите оба препарата из списка.");
    }
  };

  const startPolling = async (token: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const { data: cacheData, error } = await supabase
          .from('cache')
          .select('interact, explanation, interact_list')
          .eq('cache_token', token)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Polling error:', error);
          return;
        }

        if (cacheData) {
          setResult(String((cacheData as any).interact || ""));
          setExplanation(String((cacheData as any).explanation || ""));
          setPairs(toStringArray((cacheData as any).interact_list));
          setInteractionsArr(toStringArray((cacheData as any).interact));
          setExplanationsArr(toStringArray((cacheData as any).explanation));
          setPolling(false);
          clearInterval(pollInterval);
        }
      } catch (error) {
        console.error('Polling error:', error);
        setPolling(false);
        clearInterval(pollInterval);
      }
    }, 2000); // Проверяем каждые 2 секунды

    // Останавливаем опрос через 5 минут
    setTimeout(() => {
      if (polling) {
        setResult("Время ожидания истекло. Попробуйте еще раз.");
        setPolling(false);
        clearInterval(pollInterval);
      }
    }, 300000); // 5 минут
  };

  const handleClear = () => {
    setDrug1("");
    setDrug2("");
    setSelectedDrug1(null);
    setSelectedDrug2(null);
    setResult("");
    setExplanation("");
    setPolling(false);
    setShowContraindications(false);
    setPairs([]);
    setInteractionsArr([]);
    setExplanationsArr([]);
  };

  const handleDrug1Change = (value: string, selectedDrug?: Drug) => {
    setDrug1(value);
    setSelectedDrug1(selectedDrug || null);
    // Сбрасываем результаты при изменении препарата
    setResult("");
    setExplanation("");
    setShowContraindications(false);
    setPolling(false);
    setPairs([]);
    setInteractionsArr([]);
    setExplanationsArr([]);
  };

  const handleDrug2Change = (value: string, selectedDrug?: Drug) => {
    setDrug2(value);
    setSelectedDrug2(selectedDrug || null);
    // Сбрасываем результаты при изменении препарата
    setResult("");
    setExplanation("");
    setShowContraindications(false);
    setPolling(false);
    setPairs([]);
    setInteractionsArr([]);
    setExplanationsArr([]);
  };

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-primary text-white p-4 flex-shrink-0">
        <h1 className="text-lg font-semibold">
          MedInteract - Анализ взаимодействия препаратов
        </h1>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 flex-col md:flex-row md:overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-full md:w-1/3 lg:w-1/4 bg-[var(--neutral-100)] p-4 md:p-6 flex flex-col">
          <div className="space-y-4">
            <DrugSearchInput
              value={drug1}
              onChange={handleDrug1Change}
              placeholder="Введите МНН или ТН"
              label="Препарат 1"
            />
            
            <DrugSearchInput
              value={drug2}
              onChange={handleDrug2Change}
              placeholder="Введите МНН или ТН"
              label="Препарат 2"
            />
          </div>

            <div className="mt-6 flex flex-wrap gap-3 justify-start">
              <button
                onClick={handleCalculate}
                disabled={loading || polling}
                className="bg-primary text-white py-3 px-6 rounded-md hover:bg-primary/90 transition-colors font-medium disabled:bg-[var(--neutral-400)] disabled:cursor-not-allowed w-full sm:w-auto min-w-[140px]"
              >
                {loading ? "Отправка..." : "Рассчитать"}
              </button>
              <button
                onClick={handleClear}
                className="bg-[var(--neutral-300)] text-[var(--neutral-700)] py-3 px-6 rounded-md hover:bg-[var(--neutral-400)] transition-colors font-medium w-full sm:w-auto min-w-[140px]"
              >
                Очистить
              </button>
            </div>
        </div>

        {/* Right Content */}
        <div id="rightContent" className="flex-1 bg-[var(--background)] p-4 md:p-8 md:h-full md:overflow-y-auto">
          {selectedDrug1 && selectedDrug2 && showContraindications ? (
            <div className="space-y-6">
              {/* Карточки препаратов */}
              <div className="space-y-4">
                <DrugCard drug={selectedDrug1} position="top" />
                <DrugCard drug={selectedDrug2} position="bottom" />
              </div>
              
              {/* Результат взаимодействия */}
              <div className="bg-[var(--background)] rounded-lg p-6 shadow-sm border border-[var(--neutral-200)]">
                <h2 className="text-primary text-xl font-semibold mb-4">
                  Результат взаимодействия
                </h2>
                {polling ? (
                  <ProgressBar
                    running={polling}
                    totalMs={totalMs}
                    sessionId={progressSessionId}
                    labelTitle="Проверяю взаимодействие между"
                    labelPair={currentPairLabel}
                    current={currentPairIndex}
                    total={Math.max(1, substancePairs.length)}
                  />
                ) : result ? (
                  <div className="space-y-4">
                    {/* Убираем общий блок, показываем карточки по парам ниже */}
                    {/* Взаимодействия веществ: выводим все пары по порядку */}
                    {(() => {
                      const len = Math.max(pairs.length, interactionsArr.length, explanationsArr.length);
                      if (!len) return null;
                      return (
                        <div className="mt-4 space-y-4">
                          {Array.from({ length: len }).map((_, i) => (
                            <ResultCard
                              key={i}
                              index={i + 1}
                              pair={pairs[i]}
                              interaction={interactionsArr[i]}
                              explanation={explanationsArr[i]}
                            />
                          ))}
                        </div>
                      );
                    })()}
                    
                    {/* Дисклаймер */}
                    <div className="mt-6 p-3 bg-[var(--neutral-50)] rounded-lg border border-[var(--neutral-200)]">
                      <p className="text-xs text-[var(--neutral-600)] leading-relaxed">
                        <strong>Предупреждение:</strong> Результат оценки лекарственного взаимодействия сформирован с использованием системы искусственного интеллекта на основе официальной инструкции и известных фармакологических механизмов. Он не заменяет клиническое суждение и не является медицинским назначением. Окончательное решение о совместимости препаратов и тактике терапии должен принимать врач или фармацевт, исходя из конкретной клинической ситуации пациента.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                    <p className="text-[var(--neutral-600)] leading-relaxed">
                      Загрузка взаимодействия
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : selectedDrug1 && selectedDrug2 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                <div className="mx-auto mb-4">
                  <Image
                    src="/MedInteract.png"
                    alt="MedInteract"
                    width={150}
                    height={150}
                    className="mx-auto"
                  />
                </div>
                
                <h2 className="text-primary text-xl font-semibold mb-4">
                  Готово к анализу
                </h2>
                
                <p className="text-[var(--neutral-600)] leading-relaxed">
                  Препараты выбраны. Нажмите «Рассчитать» для анализа взаимодействия и просмотра противопоказаний.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                <div className="mx-auto mb-4">
                  <Image
                    src="/MedInteract.png"
                    alt="MedInteract"
                    width={150}
                    height={150}
                    className="mx-auto"
                  />
                </div>
                
                <h2 className="text-primary text-xl font-semibold mb-4">
                  Результат взаимодействия
                </h2>
                
                <p className="text-[var(--neutral-600)] leading-relaxed">
                  {result || "Здесь появится оценка риска и детали взаимодействия выбранных препаратов. Пожалуйста, выберите два препарата слева и нажмите «Рассчитать»."}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      <ScrollToBottomButton containerId="rightContent" />
    </div>
  );
}


