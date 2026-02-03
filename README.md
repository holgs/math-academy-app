# MathFlow Blended - Math Academy App

Apprendimento attivo, gamificato e personalizzato per la matematica.

## Stack Tecnologico

- **Framework**: Next.js 14 (App Router)
- **Linguaggio**: TypeScript
- **Styling**: Tailwind CSS + Neumorphism Design System
- **Database**: PostgreSQL (Neon) + Prisma ORM
- **Auth**: NextAuth.js
- **Animazioni**: Framer Motion
- **Grafici**: D3.js

## Design System - Neumorphism

Palette colori:
- **Background**: `#E0E5EC` (grigio chiaro)
- **Ombre**: Gradienti morbidi grigi
- **Accent Success**: `#10B981` (verde smeraldo)
- **Accent Warning**: `#F59E0B` (arancio)
- **Accent Error**: `#EF4444` (rosso)
- **NO blu/viola**

## Setup

```bash
# Installa dipendenze
npm install

# Configura variabili ambiente
cp .env.example .env.local
# Modifica DATABASE_URL e NEXTAUTH_SECRET

# Genera Prisma client
npm run db:generate

# Esegui migrazioni
npm run db:migrate

# Popola database
npm run db:seed

# Avvia sviluppo
npm run dev
```

## Variabili Ambiente

```env
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
```

## Deploy

```bash
# Build produzione
npm run build

# Deploy su Vercel
vercel --prod
```

## Funzionalità

- ✅ Autenticazione (login/register)
- ✅ Knowledge Graph visuale (D3.js)
- ✅ Sistema esercizi con feedback immediato
- ✅ Gamification (XP, monete, livelli, streak)
- ✅ Progressione basata su prerequisiti
- ✅ Design Neumorphism moderno

## Roadmap

- [ ] Generazione AI contenuti
- [ ] Dashboard docente
- [ ] Sistema lezioni LIM
- [ ] App mobile