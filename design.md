# Snip Design Tokens

A compact dark UI system inspired by a warm-glow hero and chat-like input pattern.

## Core tokens

- Background: #09090c
- Surface: #111217
- Surface elevated: #171922
- Text primary: #f3f4f6
- Text muted: #a3a7b4
- Success: #8af8cb
- Danger: #ff9f9f
- Border: #2a2f3d
- Border soft: #222634

## Accent and glow

- Accent gradient: linear-gradient(95deg, #ff8a66 0%, #ff6f91 48%, #ffb36b 100%)
- Hero glow layer 1: radial-gradient(65% 95% at 50% 0%, rgba(255, 129, 100, 0.38) 0%, rgba(255, 129, 100, 0) 72%)
- Hero glow layer 2: radial-gradient(55% 90% at 62% 2%, rgba(255, 105, 146, 0.26) 0%, rgba(255, 105, 146, 0) 68%)

## Typography

- Font stack: "Sora", "Manrope", "Avenir Next", "Segoe UI", sans-serif
- Hero title: 3rem / 700 / 1.08
- Hero subtitle: 1rem / 400 / 1.6
- Body: 0.95rem / 400 / 1.5
- Table headers: 0.78rem / 600 / 1.3 (uppercase + letter spacing)

## Spacing and shape

- Page max width: 960px
- Section gap: 1.5rem
- Control height: 3.35rem
- Radius small: 12px
- Radius medium: 18px
- Radius pill: 999px

## Borders, shadows, effects

- Panel border: 1px solid border token
- Panel shadow: 0 22px 48px rgba(0, 0, 0, 0.34)
- Input glow focus: 0 0 0 3px rgba(255, 125, 112, 0.2)
- Accent text via gradient clip for key links

## Snip mapping

- Page header: hero title + muted subline, centered in first panel.
- URL form: chat-style pill composer with attached action button.
- Result and error: compact inline notices under the composer.
- Links table: rounded surface card with subtle separators and muted meta text.
