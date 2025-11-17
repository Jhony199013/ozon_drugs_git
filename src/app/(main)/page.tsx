"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import DrugSearchInput from "@/components/ui/DrugSearchInput";
import DrugCard from "@/components/ui/DrugCard";
import { Drug, supabase, Cache } from "@/lib/api/supabase";
import { requestInteractionAnalysis } from "@/lib/api/webhook";
import ResultCard from "@/components/ui/ResultCard";
import ProgressBar from "@/components/ui/ProgressBar";
import ScrollToBottomButton from "@/components/ui/ScrollToBottomButton";
import MobileMenu from "@/components/ui/MobileMenu";

// Подсветка перенесена в утилиту '@/utils/highlight'

// Функция для генерации UUIDv5 (на основе MD5, без require)
function uuidv5FromString(input: string): string {
  // простая MD5 через встроенные средства
  const buffer = Buffer.from(input, 'utf8');
  let hash = 0;
  for (let i = 0; i < buffer.length; i++) {
    hash = (hash + buffer[i]) & 0xffffffff;
  }
  const hex = ('00000000' + hash.toString(16)).slice(-8);
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isPageReady, setIsPageReady] = useState(false);

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

  // Проверка готовности страницы (Next.js Image сам управляет загрузкой)
  useEffect(() => {
    // Небольшая задержка для завершения рендеринга всех компонентов
    const timer = setTimeout(() => {
      setIsPageReady(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Нормализатор: в массив строк
  const toStringArray = (value: unknown): string[] => {
    if (!value) return [];
    if (Array.isArray(value)) return value.map((v) => String(v));
    // если пришла строка JSON массива
    try {
      const parsed = JSON.parse(String(value));
      if (Array.isArray(parsed)) return parsed.map((v) => String(v));
    } catch {
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
        // Генерируем токен из действующих веществ (active_Substance),
        // независимо от их количества и порядка.
        const leftSubstances = parseActiveSubstances(
          selectedDrug1.active_Substance
        );
        const rightSubstances = parseActiveSubstances(
          selectedDrug2.active_Substance
        );

        const allSubstances = [...leftSubstances, ...rightSubstances]
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean);

        let tokenInput: string;

        if (allSubstances.length > 0) {
          // Убираем дубликаты и сортируем — порядок и количество повторов не влияют
          const uniqueSorted = Array.from(new Set(allSubstances)).sort();
          tokenInput = `substances:${uniqueSorted.join("+")}`;
        } else {
          // Fallback: если действующие вещества не указаны, используем названия препаратов
          const drug1Name = drug1.trim().toLowerCase();
          const drug2Name = drug2.trim().toLowerCase();
          const sortedNames = [drug1Name, drug2Name].sort();
          tokenInput = `names:${sortedNames.join("+")}`;
        }

        const token = uuidv5FromString(tokenInput);

        // Проверяем кэш
        const { data: cacheData, error: cacheError } = await supabase
          .from('cache')
          .select('interact, explanation, interact_list')
          .eq('cache_token', token)
          .maybeSingle();

        if (cacheError) {
          console.error('Cache error:', cacheError);
          setResult("Ошибка при проверке кэша. Попробуйте еще раз.");
          setLoading(false);
          return;
        }

        if (cacheData) {
          // Результат найден в кэше
          const cache = cacheData as Cache;
          setResult(String(cache.interact || ""));
          setPairs(toStringArray(cache.interact_list));
          setInteractionsArr(toStringArray(cache.interact));
          setExplanationsArr(toStringArray(cache.explanation));
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
          .maybeSingle();

        if (error) {
          console.error('Polling error:', error);
          return;
        }

        if (cacheData) {
          const cache = cacheData as Cache;
          setResult(String(cache.interact || ""));
          setPairs(toStringArray(cache.interact_list));
          setInteractionsArr(toStringArray(cache.interact));
          setExplanationsArr(toStringArray(cache.explanation));
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
    setShowContraindications(false);
    setPolling(false);
    setPairs([]);
    setInteractionsArr([]);
    setExplanationsArr([]);
  };

  if (!isPageReady) {
    return (
      <div className="h-screen bg-background flex flex-col">
        <header className="bg-primary text-white flex-shrink-0 flex items-center h-16 relative z-[51]">
          <h1 className="text-lg font-bold px-4 font-helvetica-bold">
            Анализ взаимодействия препаратов
          </h1>
        </header>
        <div className="flex-1 bg-[var(--background)]"></div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-primary text-white flex-shrink-0 flex items-center h-16 relative z-[51]">
        <h1 className="text-lg font-bold px-4 font-helvetica-bold">
          Анализ взаимодействия препаратов
        </h1>
        {/* Desktop menu */}
        <div className="max-w-[1700px] px-4 flex items-center gap-3 ml-auto hidden md:flex">
          <a
            href="/api/redirect/telegram"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:opacity-80 transition-opacity flex items-center"
            aria-label="Telegram"
          >
            <Image
              src="/TG.png"
              alt="Telegram"
              width={27}
              height={27}
              priority
              quality={90}
            />
          </a>
          <a
            href="/api/redirect/vk"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:opacity-80 transition-opacity flex items-center"
            aria-label="VKontakte"
          >
            <Image
              src="/VK.png"
              alt="VKontakte"
              width={27}
              height={27}
              priority
              quality={90}
            />
          </a>
          <a
            href="/api/redirect/chatbot"
            target="_blank"
            rel="noopener noreferrer"
            className="text-base font-bold hover:opacity-80 transition-opacity font-helvetica-bold"
          >
            Чат-бот
          </a>
          <a
            href="/api/redirect/help"
            target="_blank"
            rel="noopener noreferrer"
            className="text-base font-bold hover:opacity-80 transition-opacity font-helvetica-bold"
          >
            Помощь
          </a>
        </div>
        {/* Mobile menu button */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="btn-menu-toggle md:hidden ml-auto"
          aria-label="Меню"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {isMobileMenuOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
        {/* Mobile menu */}
        <MobileMenu
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
        />
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
                className="btn btn-primary btn--responsive"
              >
                {loading ? "Отправка..." : "Рассчитать"}
              </button>
              <button
                onClick={handleClear}
                className="btn btn-secondary btn--responsive"
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
                <div className="mx-auto mb-1 h-[44px] flex items-center justify-center">
                  <Image
                    src="/Logo_pharmSkills.png"
                    alt="Logo pharmSkills"
                    width={160}
                    height={44}
                    className="mx-auto"
                    priority
                    quality={90}
                  />
                </div>
                
                <p className="text-[var(--neutral-600)] leading-relaxed">
                  Препараты выбраны. Нажмите «Рассчитать» для анализа взаимодействия и просмотра противопоказаний.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                <div className="mx-auto mb-4 h-[44px] flex items-center justify-center">
                  <Image
                    src="/Logo_pharmSkills.png"
                    alt="Logo pharmSkills"
                    width={160}
                    height={44}
                    className="mx-auto"
                    priority
                    quality={90}
                  />
                </div>
                
                <p className="text-[var(--neutral-600)] leading-relaxed">
                  {result || "Здесь появится оценка риска и детали взаимодействия выбранных препаратов. Пожалуйста, выберите два препарата и нажмите «Рассчитать»."}
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


