// src/app/components/PasswordStrengthInput.tsx
//
// Componente reutilizável de campo de senha com indicador de força.
// Usar em: Signup.tsx e Settings.tsx (troca de senha).
//
// Exemplo de uso:
//   <PasswordStrengthInput
//     id="password"
//     label="Nova senha"
//     value={password}
//     onChange={setPassword}
//     disabled={loading}
//   />

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

// ── Regras de senha forte ─────────────────────────────────────────────────────
export const PASSWORD_RULES = [
  { label: 'Mínimo 8 caracteres',              test: (v: string) => v.length >= 8 },
  { label: 'Pelo menos uma letra maiúscula',   test: (v: string) => /[A-Z]/.test(v) },
  { label: 'Pelo menos um número',             test: (v: string) => /[0-9]/.test(v) },
  { label: 'Pelo menos um caractere especial', test: (v: string) => /[^A-Za-z0-9]/.test(v) },
] as const;

export function isStrongPassword(value: string): boolean {
  return PASSWORD_RULES.every((r) => r.test(value));
}

// ── Barra de força visual ─────────────────────────────────────────────────────
function StrengthBar({ password }: { password: string }) {
  if (!password) return null;

  const passed = PASSWORD_RULES.filter((r) => r.test(password)).length;
  const levels = [
    { min: 1, label: 'Muito fraca',  color: 'bg-red-500' },
    { min: 2, label: 'Fraca',        color: 'bg-orange-500' },
    { min: 3, label: 'Razoável',     color: 'bg-yellow-500' },
    { min: 4, label: 'Forte',        color: 'bg-green-500' },
  ];
  const level = [...levels].reverse().find((l) => passed >= l.min) ?? levels[0];

  return (
    <div className="mt-2">
      {/* Barra segmentada */}
      <div className="flex gap-1 mb-2">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              i <= passed ? level.color : 'bg-muted'
            }`}
          />
        ))}
      </div>
      <p className={`text-xs font-medium mb-1.5 ${
        passed >= 4 ? 'text-green-600 dark:text-green-400' :
        passed >= 3 ? 'text-yellow-600 dark:text-yellow-400' :
                      'text-red-600 dark:text-red-400'
      }`}>
        {level.label}
      </p>
      {/* Checklist */}
      <ul className="space-y-1">
        {PASSWORD_RULES.map((r) => {
          const ok = r.test(password);
          return (
            <li key={r.label} className={`text-xs flex items-center gap-1.5 ${
              ok ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
            }`}>
              <span className="shrink-0">{ok ? '✓' : '○'}</span>
              {r.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
interface Props {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  showStrength?: boolean;   // default: true
  required?: boolean;
}

export function PasswordStrengthInput({
  id,
  label,
  value,
  onChange,
  disabled = false,
  placeholder = 'Mínimo 8 caracteres',
  showStrength = true,
  required = true,
}: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-foreground mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full px-4 py-2.5 pr-10 bg-accent border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          tabIndex={-1}
          aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
        >
          {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {showStrength && <StrengthBar password={value} />}
    </div>
  );
}
