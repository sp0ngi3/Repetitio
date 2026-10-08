import { BriefcaseBusiness, Check, Moon, Palette, Sun, Waves } from "lucide-react";
import type { ColorMode, MotionPreference, VisualStyle } from "./appearance";

interface AppearanceSettingsProps {
  mode: ColorMode;
  style: VisualStyle;
  motion: MotionPreference;
  onModeChange: (mode: ColorMode) => void;
  onStyleChange: (style: VisualStyle) => void;
  onMotionChange: (motion: MotionPreference) => void;
}

export function AppearanceSettings({ mode, style, motion, onModeChange, onStyleChange, onMotionChange }: AppearanceSettingsProps) {
  return (
    <section className="appearance-settings" aria-labelledby="appearance-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Preferences</p>
          <h2 id="appearance-title"><Palette size={20} aria-hidden="true" />Appearance</h2>
        </div>
      </div>
      <fieldset className="appearance-styles">
        <legend>Visual style</legend>
        {(["professional", "vaporwave"] as const).map(value => {
          const Icon = value === "professional" ? BriefcaseBusiness : Waves;
          return (
            <label className={`appearance-choice ${style === value ? "selected" : ""}`} key={value}>
              <input type="radio" name="visual-style" value={value} checked={style === value} onChange={() => onStyleChange(value)} />
              <span className={`appearance-sample sample-${value}`} aria-hidden="true">
                <span className="sample-nav"><span /><span /><span /></span>
                <span className="sample-body"><i /><span className="sample-rows"><span /><span /><span /></span></span>
              </span>
              <span className="appearance-choice-label">
                <Icon size={18} aria-hidden="true" />
                <strong>{value === "professional" ? "Professional" : "Vaporwave"}</strong>
                <Check className="appearance-check" size={18} aria-hidden="true" />
              </span>
              <span className="appearance-swatches" aria-hidden="true"><i /><i /><i /><i /></span>
            </label>
          );
        })}
      </fieldset>
      <div className="appearance-options">
        <fieldset className="appearance-mode">
          <legend>Color mode</legend>
          <div className="appearance-segmented">
            {(["light", "dark"] as const).map(value => {
              const Icon = value === "light" ? Sun : Moon;
              return (
                <label key={value} className={mode === value ? "selected" : ""}>
                  <input type="radio" name="color-mode" value={value} checked={mode === value} onChange={() => onModeChange(value)} />
                  <Icon size={16} aria-hidden="true" />{value === "light" ? "Light" : "Dark"}
                </label>
              );
            })}
          </div>
        </fieldset>
        <label className="appearance-motion">
          <span>Motion</span>
          <select aria-label="Motion preference" value={motion} onChange={event => onMotionChange(event.target.value as MotionPreference)}>
            <option value="system">Follow device preference</option>
            <option value="reduced">Reduced motion</option>
          </select>
        </label>
      </div>
    </section>
  );
}
