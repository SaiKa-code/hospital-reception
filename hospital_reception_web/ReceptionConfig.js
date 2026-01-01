export const ReceptionConfig = {
    // UI Layout Configuration
    UI: {
        HEADER: {
            X: 960,
            Y: 90,
            WIDTH: 500,
            HEIGHT: 80,
            CORNER_RADIUS: 24,
            COLORS: {
                BASE: 0x27AE60,
                SHADOW: 0x000000,
                TEXT: '#FFFFFF',
                STROKE: '#000000'
            }
        },
        PATIENT_AREA: {
            START_X: 300,
            GAP_X: 350,
            Y: 380,
            IMAGE_HEIGHT: 400
        },
        NAME_TAG: {
            WIDTH: 280,
            HEIGHT: 90,
            OFFSET_Y: 250,
            CORNER_RADIUS: 12
        },
        SCROLL_ARROWS: {
            LEFT_X: 50,
            RIGHT_X: 1870,
            Y: 540
        },
        PANEL: {
            CENTER_X: 1450,
            Y: 700,
            HEIGHT: 400,
            BG_COLOR: 0x000000,
            STROKE_COLOR: 0xffffff
        }
    },
    
    // Game Logic / Balance
    GAME: {
        INITIAL_PATIENTS: 3,
        MAX_PATIENTS_DISPLAY: 10,
        WAITING_TIME_PER_PATIENT: 4000, // ms
    },

    // Styles
    STYLES: {
        FONT_FAMILY: '"Noto Sans JP", sans-serif',
        COLORS: {
            PRIMARY: 0x3498DB,
            WARNING: 0xF39C12,
            DANGER: 0xE74C3C,
            SUCCESS: 0x2ECC71,
            TEXT_DARK: '#333333',
            TEXT_LIGHT: '#FFFFFF'
        }
    }
};
