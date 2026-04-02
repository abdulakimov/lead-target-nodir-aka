import type { LeadFormCopy } from "../lib/content-schema";
import locationsData from "../../data/uzbekistan-locations.json";

type Props = {
  id: string;
  copy: LeadFormCopy;
};

type RegionItem = {
  code: string;
  name: string;
  districts: Array<{ code: string; name: string }>;
};

export default function LeadForm({ id, copy }: Props) {
  const regions = [...(locationsData.regions as RegionItem[])].sort((a, b) => a.name.localeCompare(b.name, "uz"));
  const regionMap = Object.fromEntries(regions.map((region) => [region.code, { name: region.name, districts: region.districts }]));

  const initScript = `
    (() => {
      const root = document.getElementById(${JSON.stringify(id)});
      if (!root) return;

      const form = root.querySelector('form');
      if (!form) return;

      const regionData = ${JSON.stringify(regionMap)};
      const districtPlaceholder = ${JSON.stringify(copy.districtPlaceholder)};

      const stepRegion = root.querySelector('[data-step="region"]');
      const stepDistrict = root.querySelector('[data-step="district"]');
      const stepAge = root.querySelector('[data-step="age"]');
      const stepParent = root.querySelector('[data-step="parent"]');
      const stepPhone = root.querySelector('[data-step="phone"]');

      const regionDropdown = root.querySelector('[data-dropdown="region"]');
      const districtDropdown = root.querySelector('[data-dropdown="district"]');
      const ageDropdown = root.querySelector('[data-dropdown="child_age"]');

      const regionCodeInput = root.querySelector('input[name="region_code"]');
      const regionNameInput = root.querySelector('input[name="region_name"]');
      const districtInput = root.querySelector('input[name="preferred_branch"]');
      const ageInput = root.querySelector('input[name="child_age"]');
      const parentInput = root.querySelector('input[name="parent_name"]');
      const phoneInput = root.querySelector('input[name="phone"]');
      const leadIdInput = root.querySelector('input[name="lead_id"]');
      const submitButton = root.querySelector('button[type="submit"]');
      const fbpInput = root.querySelector('input[name="fbp"]');
      const fbcInput = root.querySelector('input[name="fbc"]');
      const fbclidInput = root.querySelector('input[name="fbclid"]');
      const utmSourceInput = root.querySelector('input[name="utm_source"]');
      const utmMediumInput = root.querySelector('input[name="utm_medium"]');
      const utmCampaignInput = root.querySelector('input[name="utm_campaign"]');
      const utmContentInput = root.querySelector('input[name="utm_content"]');
      const utmTermInput = root.querySelector('input[name="utm_term"]');
      const sourceUrlInput = root.querySelector('input[name="source_url"]');

      const districtMenu = districtDropdown ? districtDropdown.querySelector('[data-menu]') : null;

      const params = new URLSearchParams(window.location.search);
      const refParams = (() => {
        try {
          const ref = new URL(document.referrer);
          if (ref.origin !== window.location.origin) return new URLSearchParams();
          return ref.searchParams;
        } catch {
          return new URLSearchParams();
        }
      })();

      const readStorage = (key) => {
        try {
          return sessionStorage.getItem('trk_' + key) || '';
        } catch {
          return '';
        }
      };

      const writeStorage = (key, value) => {
        if (!value) return;
        try {
          sessionStorage.setItem('trk_' + key, value);
        } catch {}
      };

      const readTrackedParam = (key) => {
        const fromUrl = params.get(key) || '';
        if (fromUrl) {
          writeStorage(key, fromUrl);
          return fromUrl;
        }
        const fromReferrer = refParams.get(key) || '';
        if (fromReferrer) {
          writeStorage(key, fromReferrer);
          return fromReferrer;
        }
        return readStorage(key);
      };

      if (leadIdInput) {
        const leadId = readTrackedParam('lead_id') || readTrackedParam('id') || '';
        if (leadId) leadIdInput.value = leadId;
      }

      const getCookie = (name) => {
        const match = document.cookie.match(new RegExp('(^|; )' + name.replace(/[.$?*|{}()\\[\\]\\\\/+^]/g, '\\\\$&') + '=([^;]*)'));
        return match ? decodeURIComponent(match[2]) : '';
      };

      if (fbpInput) {
        const fbp = getCookie('_fbp');
        if (fbp) fbpInput.value = fbp;
      }

      if (fbcInput) {
        const fbclid = readTrackedParam('fbclid');
        if (fbclid) {
          fbcInput.value = 'fb.1.' + Math.floor(Date.now() / 1000) + '.' + fbclid;
        } else {
          const fbc = getCookie('_fbc');
          if (fbc) fbcInput.value = fbc;
        }
      }

      {
        const fbclid = readTrackedParam('fbclid') || '';
        const utmSource = readTrackedParam('utm_source') || '';
        const utmMedium = readTrackedParam('utm_medium') || '';
        const utmCampaign = readTrackedParam('utm_campaign') || '';
        const utmContent = readTrackedParam('utm_content') || '';
        const utmTerm = readTrackedParam('utm_term') || '';
        if (fbclidInput) fbclidInput.value = fbclid;
        if (utmSourceInput) utmSourceInput.value = utmSource;
        if (utmMediumInput) utmMediumInput.value = utmMedium;
        if (utmCampaignInput) utmCampaignInput.value = utmCampaign;
        if (utmContentInput) utmContentInput.value = utmContent;
        if (utmTermInput) utmTermInput.value = utmTerm;
        if (sourceUrlInput) {
          const currentUrl = window.location.href;
          const referrerUrl = document.referrer || '';
          const currentHasUtm = Boolean(utmSource || utmMedium || utmCampaign || utmContent || utmTerm);
          sourceUrlInput.value = currentHasUtm ? currentUrl : (referrerUrl || currentUrl);
        }
      }

      const closeAll = (except) => {
        root.querySelectorAll('[data-dropdown].is-open').forEach((dropdown) => {
          if (dropdown !== except) {
            dropdown.classList.remove('is-open');
            const trigger = dropdown.querySelector('[data-trigger]');
            if (trigger) trigger.setAttribute('aria-expanded', 'false');
          }
        });
      };

      const getVisibleBottom = () => {
        if (window.visualViewport) {
          return window.visualViewport.offsetTop + window.visualViewport.height;
        }
        return window.innerHeight;
      };

      const keepFieldVisible = (field) => {
        if (!field || typeof field.getBoundingClientRect !== 'function') return;
        const rect = field.getBoundingClientRect();
        const visibleBottom = getVisibleBottom();
        const safeTop = 12;
        const safeBottom = 14;

        if (rect.bottom > visibleBottom - safeBottom) {
          const delta = rect.bottom - (visibleBottom - safeBottom);
          window.scrollBy({ top: delta + 8, behavior: 'smooth' });
          return;
        }

        if (rect.top < safeTop) {
          window.scrollBy({ top: rect.top - safeTop, behavior: 'smooth' });
        }
      };

      const resetDropdown = (dropdown, placeholder, disabled) => {
        if (!dropdown) return;
        const input = dropdown.querySelector('[data-input]');
        const labelEl = dropdown.querySelector('[data-label]');
        if (input) input.value = '';
        if (labelEl) labelEl.textContent = placeholder;
        dropdown.classList.add('is-placeholder');
        dropdown.classList.remove('is-invalid', 'is-open');
        const trigger = dropdown.querySelector('[data-trigger]');
        if (trigger) {
          trigger.setAttribute('aria-expanded', 'false');
          trigger.disabled = Boolean(disabled);
        }
      };

      const setDropdownValue = (dropdown, value, label) => {
        const input = dropdown.querySelector('[data-input]');
        const labelEl = dropdown.querySelector('[data-label]');
        if (!input || !labelEl) return;
        input.value = value;
        labelEl.textContent = label;
        dropdown.classList.remove('is-placeholder', 'is-invalid');
        dropdown.dispatchEvent(new CustomEvent('dropdown:change', { detail: { value, label } }));
      };

      const hideStep = (stepNode) => {
        if (!stepNode) return;
        stepNode.classList.add('form-step-hidden');
      };

      const showStep = (stepNode) => {
        if (!stepNode) return;
        stepNode.classList.remove('form-step-hidden');
      };

      const clearInput = (inputNode) => {
        if (inputNode) inputNode.value = '';
      };

      const isFilled = (inputNode) => Boolean(inputNode && String(inputNode.value || '').trim());
      const PHONE_PREFIX = '+998 ';
      const PHONE_PREFIX_LEN = PHONE_PREFIX.length;
      const PHONE_DIGITS_LEN = 9;

      const extractPhoneDigits = (rawValue) => {
        const onlyDigits = String(rawValue || '').replace(/[^0-9]/g, '');
        const normalized = onlyDigits.startsWith('998') ? onlyDigits.slice(3) : onlyDigits;
        return normalized.slice(0, PHONE_DIGITS_LEN);
      };

      const formatPhoneDisplay = (digits) => {
        const d = String(digits || '');
        const p1 = d.slice(0, 2);
        const p2 = d.slice(2, 5);
        const p3 = d.slice(5, 7);
        const p4 = d.slice(7, 9);
        const parts = [p1, p2, p3, p4].filter(Boolean);
        return PHONE_PREFIX + parts.join('-');
      };

      const isPhoneComplete = (rawValue) => extractPhoneDigits(rawValue).length === PHONE_DIGITS_LEN;

      const syncFlow = () => {
        const hasRegion = isFilled(regionCodeInput);
        const hasDistrict = isFilled(districtInput);
        const hasAge = isFilled(ageInput);
        const hasParent = isFilled(parentInput);
        const hasPhone = isPhoneComplete(phoneInput ? phoneInput.value : '');

        if (hasRegion) {
          showStep(stepDistrict);
        } else {
          hideStep(stepDistrict);
          hideStep(stepAge);
          hideStep(stepParent);
          hideStep(stepPhone);
          resetDropdown(districtDropdown, districtPlaceholder, true);
          resetDropdown(ageDropdown, ${JSON.stringify(copy.agePlaceholder)}, false);
          clearInput(regionNameInput);
          clearInput(districtInput);
          clearInput(ageInput);
          clearInput(parentInput);
          clearInput(phoneInput);
        }

        if (hasRegion && hasDistrict) {
          showStep(stepAge);
        } else {
          hideStep(stepAge);
          hideStep(stepParent);
          hideStep(stepPhone);
          resetDropdown(ageDropdown, ${JSON.stringify(copy.agePlaceholder)}, false);
          clearInput(ageInput);
          clearInput(parentInput);
          clearInput(phoneInput);
        }

        if (hasRegion && hasDistrict && hasAge) {
          showStep(stepParent);
        } else {
          hideStep(stepParent);
          hideStep(stepPhone);
          clearInput(parentInput);
          clearInput(phoneInput);
        }

        if (hasRegion && hasDistrict && hasAge && hasParent) {
          showStep(stepPhone);
        } else {
          hideStep(stepPhone);
          clearInput(phoneInput);
        }

        const allFilled = hasRegion && hasDistrict && hasAge && hasParent && hasPhone;
        if (submitButton) submitButton.disabled = !allFilled;
      };

      const bindDropdown = (dropdown) => {
        const trigger = dropdown.querySelector('[data-trigger]');
        const options = dropdown.querySelector('[data-menu]');
        if (!trigger || !options) return;

        trigger.addEventListener('click', () => {
          if (trigger.disabled) return;
          const willOpen = !dropdown.classList.contains('is-open');
          closeAll(dropdown);
          dropdown.classList.toggle('is-open', willOpen);
          trigger.setAttribute('aria-expanded', String(willOpen));
        });

        options.addEventListener('click', (event) => {
          const option = event.target.closest('[data-option]');
          if (!option) return;
          setDropdownValue(dropdown, option.getAttribute('data-value') || '', option.textContent || '');
          dropdown.classList.remove('is-open');
          trigger.setAttribute('aria-expanded', 'false');
          syncFlow();
        });
      };

      root.querySelectorAll('[data-dropdown]').forEach(bindDropdown);

      if (regionDropdown && districtDropdown && regionNameInput && districtMenu) {
        regionDropdown.addEventListener('dropdown:change', (event) => {
          const regionCode = event.detail?.value || '';
          const region = regionData[regionCode];
          regionNameInput.value = region ? region.name : '';

          districtMenu.innerHTML = '';
          resetDropdown(districtDropdown, districtPlaceholder, !region);

          if (!region) {
            syncFlow();
            return;
          }

          region.districts.forEach((district) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'ui-dropdown-option';
            button.setAttribute('data-option', 'true');
            button.setAttribute('data-value', district.name);
            button.textContent = district.name;
            districtMenu.appendChild(button);
          });

          syncFlow();
        });
      }

      document.addEventListener('click', (event) => {
        if (!root.contains(event.target)) closeAll(null);
      });

      if (parentInput) {
        parentInput.addEventListener('input', syncFlow);
        parentInput.addEventListener('focus', () => {
          setTimeout(() => keepFieldVisible(parentInput), 80);
          setTimeout(() => keepFieldVisible(parentInput), 220);
          setTimeout(() => keepFieldVisible(parentInput), 420);
        });
      }

      if (phoneInput) {
        phoneInput.value = PHONE_PREFIX;
        phoneInput.addEventListener('input', () => {
          const digits = extractPhoneDigits(phoneInput.value);
          phoneInput.value = formatPhoneDisplay(digits);
          if (phoneInput.setSelectionRange) {
            const end = phoneInput.value.length;
            phoneInput.setSelectionRange(end, end);
          }
          syncFlow();
        });
        phoneInput.addEventListener('focus', () => {
          if (!phoneInput.value || !phoneInput.value.startsWith(PHONE_PREFIX)) {
            phoneInput.value = PHONE_PREFIX;
          }
          if (phoneInput.setSelectionRange) {
            const end = phoneInput.value.length;
            phoneInput.setSelectionRange(end, end);
          }
        });
        phoneInput.addEventListener('keydown', (event) => {
          const start = phoneInput.selectionStart ?? 0;
          const end = phoneInput.selectionEnd ?? 0;
          const isDeleting = event.key === 'Backspace' || event.key === 'Delete';
          if (isDeleting && start <= PHONE_PREFIX_LEN && end <= PHONE_PREFIX_LEN) {
            event.preventDefault();
          }
        });
        phoneInput.addEventListener('focus', () => {
          setTimeout(() => keepFieldVisible(phoneInput), 80);
          setTimeout(() => keepFieldVisible(phoneInput), 220);
          setTimeout(() => keepFieldVisible(phoneInput), 420);
        });
      }

      if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', () => {
          const active = document.activeElement;
          if (active && root.contains(active) && active.matches('input[type="text"], input[type="tel"], textarea')) {
            keepFieldVisible(active);
          }
        });
      }

      showStep(stepRegion);
      hideStep(stepDistrict);
      hideStep(stepAge);
      hideStep(stepParent);
      hideStep(stepPhone);
      if (submitButton) submitButton.disabled = true;

      form.addEventListener('submit', (event) => {
        syncFlow();
        if (submitButton && submitButton.disabled) {
          event.preventDefault();
          return;
        }

        let hasError = false;
        root.querySelectorAll('[data-dropdown][data-required="true"]').forEach((dropdown) => {
          const input = dropdown.querySelector('[data-input]');
          if (!input || input.value) return;
          dropdown.classList.add('is-invalid');
          hasError = true;
        });

        if (hasError) {
          event.preventDefault();
          const firstInvalid = root.querySelector('[data-dropdown].is-invalid [data-trigger]');
          if (firstInvalid) firstInvalid.focus();
        }
      });
    })();
  `;

  return (
    <aside className="lead-card" id={id}>
      <h2>{copy.title}</h2>
      <p className="lead-note">{copy.note}</p>
      <form className="lead-form" action="/api/lead/submit" method="post">
        <input type="hidden" name="lead_id" defaultValue="" />
        <input type="hidden" name="fbp" defaultValue="" />
        <input type="hidden" name="fbc" defaultValue="" />
        <input type="hidden" name="fbclid" defaultValue="" />
        <input type="hidden" name="utm_source" defaultValue="" />
        <input type="hidden" name="utm_medium" defaultValue="" />
        <input type="hidden" name="utm_campaign" defaultValue="" />
        <input type="hidden" name="utm_content" defaultValue="" />
        <input type="hidden" name="utm_term" defaultValue="" />
        <input type="hidden" name="source_url" defaultValue="" />
        <div data-step="region">
          <div className="ui-dropdown is-placeholder" data-dropdown="region" data-required="true">
            <button type="button" className="ui-dropdown-trigger" data-trigger aria-expanded="false">
              <span data-label>{copy.regionPlaceholder}</span>
              <span className="ui-dropdown-arrow" aria-hidden="true" />
            </button>
            <div className="ui-dropdown-menu" data-menu>
              {regions.map((region) => (
                <button key={region.code} type="button" className="ui-dropdown-option" data-option data-value={region.code}>
                  {region.name}
                </button>
              ))}
            </div>
            <input type="hidden" name="region_code" data-input value="" />
            <input type="hidden" name="region_name" value="" data-role="region-name" />
          </div>
        </div>

        <div data-step="district" className="form-step-hidden">
          <div className="ui-dropdown is-placeholder" data-dropdown="district" data-required="true">
            <button type="button" className="ui-dropdown-trigger" data-trigger aria-expanded="false" disabled>
              <span data-label>{copy.districtPlaceholder}</span>
              <span className="ui-dropdown-arrow" aria-hidden="true" />
            </button>
            <div className="ui-dropdown-menu" data-menu />
            <input type="hidden" name="preferred_branch" data-input value="" />
          </div>
        </div>

        <div data-step="age" className="form-step-hidden">
          <div className="ui-dropdown is-placeholder" data-dropdown="child_age" data-required="true">
            <button type="button" className="ui-dropdown-trigger" data-trigger aria-expanded="false">
              <span data-label>{copy.agePlaceholder}</span>
              <span className="ui-dropdown-arrow" aria-hidden="true" />
            </button>
            <div className="ui-dropdown-menu" data-menu>
              {copy.ageOptions.map((option) => (
                <button key={option} type="button" className="ui-dropdown-option" data-option data-value={option}>
                  {option}
                </button>
              ))}
            </div>
            <input type="hidden" name="child_age" data-input value="" />
          </div>
        </div>

        <div data-step="parent" className="form-step-hidden">
          <label className="sr-only" htmlFor={`${id}-parentName`}>
            Ismingiz
          </label>
          <input className="input" id={`${id}-parentName`} name="parent_name" type="text" placeholder={copy.parentPlaceholder} required />
        </div>

        <div data-step="phone" className="form-step-hidden">
          <label className="sr-only" htmlFor={`${id}-phone`}>
            Telefon raqami
          </label>
          <input
            className="input"
            id={`${id}-phone`}
            name="phone"
            type="tel"
            placeholder={copy.phonePlaceholder}
            inputMode="tel"
            required
          />
        </div>

        <div className="lead-submit-wrap" data-submit-wrap>
          <button className="cta cta-wide" type="submit" disabled>
            {copy.submitText}
          </button>
        </div>
        <p className="micro">{copy.consentText}</p>
      </form>
      <script dangerouslySetInnerHTML={{ __html: initScript }} />
    </aside>
  );
}
