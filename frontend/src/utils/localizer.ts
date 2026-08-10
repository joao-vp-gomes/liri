// frontend/src/utils/localizer.ts
/*

Displays UI text in different languages and contexts.
Two functions (translate and format) combined into one (t).

translate():
- Translates the 'text' string into a supported 'language'.
- 'text' must be written in kebab-case in English.
- Uses the local lexicon at /frontend/src/data/lexicon.json
- If 'text' is not found in the lexicon, returns the original 'text'.

format():
- Formats 'text' into one of five formats, according to 'mode', which can be:
    -- LOWERCASE: All letters lowercase.
    -- UPPERCASE: All letters uppercase.
    -- TITLECASE:
        --- All initial letters uppercase.
        --- Non-trivial uppercase letters are preserved.
        --- Note: Non-trivial lowercase letters are NOT preserved.
    -- PLAIN: Grammatically normal text. Function's default return.
    -- PLAIN_FIRST_UPPER: Grammatically normal text, but with the first letter uppercase.
- 'text' must be written in grammatically normal form (PLAIN).

*/


import lexicon from '../data/lexicon.json'


// translate: -------------------------------------------------------------------------------------------------------------------

const supportedLanguagesList = ['en', 'pt'] as const;
type SupportedLanguage = typeof supportedLanguagesList[number];
type ARGS_translante = {
    text: string, 
    language: SupportedLanguage
}
export const translate = (args: ARGS_translante): string => {
    const key = args.text.toLowerCase().replace(/_/g, '-');
    return lexicon[key as keyof typeof lexicon]?.[args.language] ?? args.text;
}


// format: ----------------------------------------------------------------------------------------------------------------------

type ARGS_format = {
    text: string, 
    mode: 'LOWERCASE' | 'UPPERCASE' | 'TITLECASE' | 'PLAIN' | 'PLAIN_FIRST_UPPER'
}
export const format = (args: ARGS_format): string => {
    switch(args.mode) {
        case 'LOWERCASE': return args.text.toLowerCase();
        case 'UPPERCASE': return args.text.toUpperCase();
        case 'TITLECASE': return args.text.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        case 'PLAIN_FIRST_UPPER': return args.text.charAt(0).toUpperCase() + args.text.slice(1);
        case 'PLAIN': default: return args.text;
    }
}


// t: ---------------------------------------------------------------------------------------------------------------------------

type ARGS_t = {
    text: string, 
    language: SupportedLanguage, 
    mode: 'LOWERCASE' | 'UPPERCASE' | 'TITLECASE' | 'PLAIN' | 'PLAIN_FIRST_UPPER'
}
export const t = (args: ARGS_t): string => {
    return format({text: translate({text: args.text, language: args.language}), mode: args.mode});
}



