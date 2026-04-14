# Truss Breaker

SPA w Vue 3 + TypeScript do modelowania i obliczania płaskich układów kratownicowych metodą sztywności.

## Uruchomienie

```bash
npm install
npm run dev
```

## Build produkcyjny

```bash
npm run build
```

## Funkcje

- rysowanie węzłów, prętów, podpór i sił na interaktywnym canvasie SVG
- zapisywanie wielu projektów w Local Storage
- automatyczny zapis zmian
- obliczanie przemieszczeń, sił osiowych, naprężeń i reakcji podpór
- wizualizacja wyników na canvasie i w panelu bocznym

## Założenia modelu

- kratownica 2D
- współrzędne robocze są snapowane do siatki
- 1 jednostka siatki odpowiada 1 m modelu
- obciążenia wejściowe podawane są w kN
- moduł Younga w Pa, pole przekroju w m²
