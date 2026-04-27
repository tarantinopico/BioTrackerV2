import { Substance, UserSettings, CustomEffect } from './types';

export const DEFAULT_SUBSTANCES: Substance[] = [
  {
    "id": "substance_1774623139275",
    "name": "Kratom",
    "color": "#00ff00",
    "icon": "pill",
    "unit": "g",
    "step": 1,
    "price": 5,
    "category": "opioid",
    "description": "",
    "halfLife": 1.5,
    "tmax": 0.6,
    "bioavailability": 100,
    "onset": 13,
    "offset": null,
    "toxicity": 5,
    "toleranceRate": 10,
    "toleranceReset": 14,
    "metabolismCurve": "custom",
    "metabolismRate": 1,
    "absorptionRate": 1,
    "beta": 1.6,
    "ka": 1,
    "proteinBinding": 0,
    "volumeOfDistribution": 0.7,
    "addictionPotential": "low",
    "legalityStatus": "legal",
    "toleranceHalfLife": 7,
    "crossTolerance": [],
    "comedownEnabled": false,
    "comedownDuration": 4,
    "comedownIntensity": 5,
    "comedownSymptoms": [],
    "strains": [
      {
        "name": "White Magic",
        "price": 7.2
      },
      {
        "name": "White Šaman",
        "price": 5
      },
      {
        "name": "Green Šaman",
        "price": 5
      },
      {
        "name": "Green Magenda",
        "price": 7.2
      },
      {
        "name": "Gold KW",
        "price": 7.2
      },
      {
        "name": "Green Pure",
        "price": 7.2
      }
    ],
    "effects": [
      {
        "type": "Fokus",
        "intensity": 10,
        "onset": 0.6,
        "duration": 1.5,
        "valence": "positive",
        "customCurve": [
          { "time": 0, "level": 0 },
          { "time": 0.2, "level": 0 },
          { "time": 0.4, "level": 85 },
          { "time": 0.6, "level": 100 },
          { "time": 1, "level": 90 },
          { "time": 1.8, "level": 45 },
          { "time": 2.1, "level": 5 },
          { "time": 2.6, "level": 0 }
        ]
      },
      {
        "type": "Zácpa",
        "intensity": 6,
        "onset": 0.4,
        "duration": 1.3,
        "valence": "positive",
        "customCurve": [
          { "time": 0, "level": 0 },
          { "time": 1, "level": 5 },
          { "time": 2, "level": 4 },
          { "time": 2.6, "level": 0 }
        ]
      },
      {
        "type": "Fyzická Euforie",
        "intensity": 6,
        "onset": 0.6,
        "duration": 2,
        "valence": "positive"
      }
    ],
    "interactions": [],
    "interactionMessage": "",
    "isSevere": false,
    "customCurve": [
      { "time": 0, "level": 0 },
      { "time": 0.2, "level": 0 },
      { "time": 0.3, "level": 45 },
      { "time": 0.5, "level": 90 },
      { "time": 0.6, "level": 100 },
      { "time": 1, "level": 95 },
      { "time": 1.5, "level": 80 },
      { "time": 2, "level": 5 },
      { "time": 4, "level": 0 }
    ]
  },
  {
    "id": "substance_1774626436230",
    "name": "Nikotin",
    "color": "#00d1ff",
    "icon": "pill",
    "unit": "mg",
    "step": 0.5,
    "price": 0.69565,
    "category": "stimulant",
    "description": "",
    "halfLife": 0.4,
    "tmax": 0.1,
    "bioavailability": 100,
    "onset": 1,
    "offset": 1,
    "toxicity": 5,
    "toleranceRate": 10,
    "toleranceReset": 14,
    "metabolismCurve": "linear",
    "metabolismRate": 1,
    "absorptionRate": 1,
    "beta": 15,
    "ka": 1,
    "proteinBinding": 0,
    "volumeOfDistribution": 0.7,
    "addictionPotential": "high",
    "legalityStatus": "legal",
    "toleranceHalfLife": null,
    "crossTolerance": [],
    "comedownEnabled": false,
    "comedownDuration": 4,
    "comedownIntensity": 5,
    "comedownSymptoms": [],
    "strains": [
      { "name": "Velo5", "price": 0.69565 },
      { "name": "Zdarma", "price": 0 },
      { "name": "Kolář", "price": 0.1 }
    ],
    "effects": [
      { "type": "Stimulace", "intensity": 5, "onset": 0, "duration": 0.4, "valence": "positive" },
      { "type": "Relaxace", "intensity": 3, "onset": 0.1, "duration": 1, "valence": "positive" }
    ],
    "interactions": [],
    "interactionMessage": "",
    "isSevere": false,
    "isFavorite": false
  }
];

export const DEFAULT_DOSES = [
  {
    "id": "dose_1774678272214",
    "substanceId": "substance_1774623139275",
    "amount": 6,
    "timestamp": 1711604472214,
    "route": "oral",
    "stomach": "full",
    "note": "",
    "strainId": "White Magic",
    "bioavailabilityMultiplier": 0.9,
    "tmaxMultiplier": 1.25
  },
  {
    "id": "hrfrkbcc2",
    "substanceId": "substance_1774626436230",
    "amount": 11.5,
    "timestamp": 1711612455164,
    "route": "oral",
    "stomach": "full",
    "note": "Zkratka: Velo5",
    "bioavailabilityMultiplier": 0.9,
    "tmaxMultiplier": 1.25
  },
  {
    "id": "tt34igt41",
    "substanceId": "substance_1774626436230",
    "amount": 11.5,
    "timestamp": 1711616593002,
    "route": "oral",
    "stomach": "full",
    "note": "Zkratka: Velo5",
    "bioavailabilityMultiplier": 0.9,
    "tmaxMultiplier": 1.25
  },
  {
    "id": "1j7zkoihc",
    "substanceId": "substance_1774626436230",
    "amount": 11.5,
    "timestamp": 1711623889827,
    "route": "oral",
    "stomach": "full",
    "note": "Zkratka: Velo5",
    "bioavailabilityMultiplier": 0.9,
    "tmaxMultiplier": 1.25
  },
  {
    "id": "dose_1774696851142",
    "substanceId": "substance_1774623139275",
    "amount": 6,
    "timestamp": 1711624851141,
    "route": "oral",
    "stomach": "full",
    "note": "",
    "strainId": "White Magic",
    "bioavailabilityMultiplier": 0.9,
    "tmaxMultiplier": 1.25
  },
  {
    "id": "dose_1774711146937",
    "substanceId": "substance_1774623139275",
    "amount": 7,
    "timestamp": 1711639146937,
    "route": "oral",
    "stomach": "full",
    "note": "",
    "strainId": "Green Magenda",
    "bioavailabilityMultiplier": 0.9,
    "tmaxMultiplier": 1.25
  },
  {
    "id": "7cnoypos4",
    "substanceId": "substance_1774626436230",
    "amount": 11.5,
    "timestamp": 1711645909239,
    "route": "oral",
    "stomach": "full",
    "note": "Zkratka: Velo5",
    "bioavailabilityMultiplier": 0.9,
    "tmaxMultiplier": 1.25
  },
  {
    "id": "pdlqwmffc",
    "substanceId": "substance_1774626436230",
    "amount": 11.5,
    "timestamp": 1711648946675,
    "route": "oral",
    "stomach": "full",
    "note": "Zkratka: Velo5",
    "bioavailabilityMultiplier": 0.9,
    "tmaxMultiplier": 1.25
  },
  {
    "id": "r62o49wlk",
    "substanceId": "substance_1774626436230",
    "amount": 11.5,
    "timestamp": 1711651061269,
    "route": "oral",
    "stomach": "full",
    "note": "Zkratka: Velo5",
    "bioavailabilityMultiplier": 0.9,
    "tmaxMultiplier": 1.25
  },
  {
    "id": "dose_1774725608250",
    "substanceId": "substance_1774623139275",
    "amount": 7,
    "timestamp": 1711653608250,
    "route": "oral",
    "stomach": "full",
    "note": "",
    "strainId": "Green Magenda",
    "bioavailabilityMultiplier": 0.9,
    "tmaxMultiplier": 1.25
  },
  {
    "id": "ar6xnll7z",
    "substanceId": "substance_1774626436230",
    "amount": 11.5,
    "timestamp": 1711664429299,
    "route": "oral",
    "stomach": "full",
    "note": "Zkratka: Velo5",
    "bioavailabilityMultiplier": 0.9,
    "tmaxMultiplier": 1.25
  },
  {
    "id": "4fr9hrd70",
    "substanceId": "substance_1774626436230",
    "amount": 11.5,
    "timestamp": 1711696237012,
    "route": "oral",
    "stomach": "full",
    "note": "Zkratka: Velo5",
    "bioavailabilityMultiplier": 0.9,
    "tmaxMultiplier": 1.25
  },
  {
    "id": "dose_1774772109055",
    "substanceId": "substance_1774623139275",
    "amount": 4,
    "timestamp": 1711700109055,
    "route": "oral",
    "stomach": "full",
    "note": "",
    "strainId": "Green Magenda",
    "bioavailabilityMultiplier": 0.9,
    "tmaxMultiplier": 1.25
  },
  {
    "id": "ct2qic8gh",
    "substanceId": "substance_1774626436230",
    "amount": 11.5,
    "timestamp": 1711703814011,
    "route": "oral",
    "stomach": "full",
    "note": "Zkratka: Velo5",
    "bioavailabilityMultiplier": 0.9,
    "tmaxMultiplier": 1.25
  },
  {
    "id": "dose_1774778563371",
    "substanceId": "substance_1774623139275",
    "amount": 5,
    "timestamp": 1711706563371,
    "route": "oral",
    "stomach": "full",
    "note": "",
    "strainId": "Green Magenda",
    "bioavailabilityMultiplier": 0.9,
    "tmaxMultiplier": 1.25
  },
  {
    "id": "kp1ymvwow",
    "substanceId": "substance_1774626436230",
    "amount": 11.5,
    "timestamp": 1711716776883,
    "route": "oral",
    "stomach": "full",
    "note": "Zkratka: Velo5",
    "bioavailabilityMultiplier": 0.9,
    "tmaxMultiplier": 1.25
  },
  {
    "id": "dose_1774797611498",
    "substanceId": "substance_1774623139275",
    "amount": 7,
    "timestamp": 1711725611498,
    "route": "oral",
    "stomach": "full",
    "note": "",
    "strainId": "White Šaman",
    "bioavailabilityMultiplier": 0.9,
    "tmaxMultiplier": 1.25
  },
  {
    "id": "dose_1774846597322",
    "substanceId": "substance_1774623139275",
    "amount": 5,
    "timestamp": 1711774597322,
    "route": "oral",
    "stomach": "full",
    "note": "",
    "strainId": "White Šaman",
    "bioavailabilityMultiplier": 0.9,
    "tmaxMultiplier": 1.25
  },
  {
    "id": "07cjup8f5",
    "substanceId": "substance_1774626436230",
    "amount": 11.5,
    "timestamp": 1711776372891,
    "route": "oral",
    "stomach": "full",
    "note": "Zkratka: Velo5",
    "bioavailabilityMultiplier": 0.9,
    "tmaxMultiplier": 1.25
  },
  {
    "id": "lo33viko8",
    "substanceId": "substance_1774626436230",
    "amount": 11.5,
    "timestamp": 1711780252248,
    "route": "oral",
    "stomach": "full",
    "note": "Zkratka: Velo5",
    "bioavailabilityMultiplier": 0.9,
    "tmaxMultiplier": 1.25
  },
  {
    "id": "dose_1774853407658",
    "substanceId": "substance_1774623139275",
    "amount": 5,
    "timestamp": 1711781407658,
    "route": "oral",
    "stomach": "full",
    "note": "",
    "strainId": "White Šaman",
    "bioavailabilityMultiplier": 0.9,
    "tmaxMultiplier": 1.25
  },
  {
    "id": "zmhr8obwx",
    "substanceId": "substance_1774626436230",
    "amount": 11.5,
    "timestamp": 1711785806198,
    "route": "oral",
    "stomach": "full",
    "note": "Zkratka: Velo5",
    "bioavailabilityMultiplier": 0.9,
    "tmaxMultiplier": 1.25
  },
  {
    "id": "dose_1774864319806",
    "substanceId": "substance_1774623139275",
    "amount": 6,
    "timestamp": 1711792319806,
    "route": "oral",
    "stomach": "full",
    "note": "",
    "strainId": "White Šaman",
    "bioavailabilityMultiplier": 0.9,
    "tmaxMultiplier": 1.25
  },
  {
    "id": "dose_1774864972534",
    "substanceId": "substance_1774623139275",
    "amount": 2,
    "timestamp": 1711792972534,
    "route": "oral",
    "stomach": "full",
    "note": "",
    "strainId": "White Šaman",
    "bioavailabilityMultiplier": 0.9,
    "tmaxMultiplier": 1.25
  },
  {
    "id": "m9y09kmq9",
    "substanceId": "substance_1774626436230",
    "amount": 11.5,
    "timestamp": 1711796205207,
    "route": "oral",
    "stomach": "full",
    "note": "Zkratka: Velo5",
    "bioavailabilityMultiplier": 0.9,
    "tmaxMultiplier": 1.25
  },
  {
    "id": "l2zfagota",
    "substanceId": "substance_1774626436230",
    "amount": 11.5,
    "timestamp": 1711802348714,
    "route": "oral",
    "stomach": "full",
    "note": "Zkratka: Velo5",
    "bioavailabilityMultiplier": 0.9,
    "tmaxMultiplier": 1.25
  },
  {
    "id": "p6on5rttq",
    "substanceId": "substance_1774626436230",
    "amount": 11.5,
    "timestamp": 1711807167113,
    "route": "oral",
    "stomach": "full",
    "note": "Zkratka: Velo5",
    "bioavailabilityMultiplier": 0.9,
    "tmaxMultiplier": 1.25
  },
  {
    "id": "dose_1774883767925",
    "substanceId": "substance_1774623139275",
    "amount": 8,
    "timestamp": 1711811767925,
    "route": "oral",
    "stomach": "full",
    "note": "",
    "strainId": "Green Magenda",
    "bioavailabilityMultiplier": 0.9,
    "tmaxMultiplier": 1.25
  },
  {
    "id": "ggt0x2rpl",
    "substanceId": "substance_1774626436230",
    "strainId": "Zdarma",
    "amount": 7,
    "timestamp": 1711816548171,
    "route": "oral",
    "stomach": "full",
    "note": "Zkratka: Použity P",
    "bioavailabilityMultiplier": 0.9,
    "tmaxMultiplier": 1.25
  },
  {
    "id": "c1v87g6jf",
    "substanceId": "substance_1774626436230",
    "strainId": "Velo5",
    "amount": 11.5,
    "timestamp": 1711820339778,
    "route": "oral",
    "stomach": "full",
    "note": "Zkratka: Velo5",
    "bioavailabilityMultiplier": 0.9,
    "tmaxMultiplier": 1.25
  },
  {
    "id": "wgrqyaoz2",
    "substanceId": "substance_1774626436230",
    "strainId": "Zdarma",
    "amount": 7,
    "timestamp": 1711822597198,
    "route": "oral",
    "stomach": "full",
    "note": "Zkratka: Použity P",
    "bioavailabilityMultiplier": 0.9,
    "tmaxMultiplier": 1.25
  },
  {
    "id": "op0zk6rzj",
    "substanceId": "substance_1774626436230",
    "strainId": "Zdarma",
    "amount": 7,
    "timestamp": 1711822598151,
    "route": "oral",
    "stomach": "full",
    "note": "Zkratka: Použity P",
    "bioavailabilityMultiplier": 0.9,
    "tmaxMultiplier": 1.25
  },
  {
    "id": "dose_1774898403523",
    "substanceId": "substance_1774623139275",
    "amount": 1,
    "timestamp": 1711826403523,
    "route": "oral",
    "stomach": "full",
    "note": "",
    "strainId": "Green Magenda",
    "bioavailabilityMultiplier": 0.9,
    "tmaxMultiplier": 1.25
  },
  {
    "id": "tvaiwjp0g",
    "substanceId": "substance_1774626436230",
    "strainId": "Velo5",
    "amount": 11.5,
    "timestamp": 1711860595496,
    "route": "oral",
    "stomach": "full",
    "note": "Zkratka: Velo5",
    "bioavailabilityMultiplier": 0.9,
    "tmaxMultiplier": 1.25
  },
  {
    "id": "falusy2wg",
    "substanceId": "substance_1774626436230",
    "strainId": "Velo5",
    "amount": 11.5,
    "timestamp": 1711862803740,
    "route": "oral",
    "stomach": "full",
    "note": "Zkratka: Velo5",
    "bioavailabilityMultiplier": 0.9,
    "tmaxMultiplier": 1.25
  },
  {
    "id": "dose_1774936169497",
    "substanceId": "substance_1774623139275",
    "amount": 6,
    "timestamp": 1711864169497,
    "route": "oral",
    "stomach": "full",
    "note": "",
    "strainId": "White Šaman",
    "bioavailabilityMultiplier": 0.9,
    "tmaxMultiplier": 1.25
  },
  {
    "id": "qr9tutoez",
    "substanceId": "substance_1774626436230",
    "strainId": "Zdarma",
    "amount": 7,
    "timestamp": 1711869868032,
    "route": "oral",
    "stomach": "full",
    "note": "Zkratka: Použity P",
    "bioavailabilityMultiplier": 0.9,
    "tmaxMultiplier": 1.25
  },
  {
    "id": "dose_1774945238452",
    "substanceId": "substance_1774623139275",
    "amount": 7,
    "timestamp": 1711873238452,
    "route": "oral",
    "stomach": "full",
    "note": "",
    "strainId": "Green Magenda",
    "bioavailabilityMultiplier": 0.9,
    "tmaxMultiplier": 1.25
  },
  {
    "id": "sse0y2zmg",
    "substanceId": "substance_1774626436230",
    "strainId": "Zdarma",
    "amount": 7,
    "timestamp": 1711881038901,
    "route": "oral",
    "stomach": "full",
    "note": "Zkratka: Použity P",
    "bioavailabilityMultiplier": 0.9,
    "tmaxMultiplier": 1.25
  },
  {
    "id": "kfc0t9xfl",
    "substanceId": "substance_1774626436230",
    "strainId": "Velo5",
    "amount": 11.5,
    "timestamp": 1711883530518,
    "route": "oral",
    "stomach": "full",
    "note": "Zkratka: Velo5",
    "bioavailabilityMultiplier": 0.9,
    "tmaxMultiplier": 1.25
  },
  {
    "id": "dose_1774961138608",
    "substanceId": "substance_1774623139275",
    "amount": 7,
    "timestamp": 1711889138608,
    "route": "oral",
    "stomach": "full",
    "note": "",
    "strainId": null,
    "bioavailabilityMultiplier": 0.9,
    "tmaxMultiplier": 1.25
  },
  {
    "id": "l5wlfgmpt",
    "substanceId": "substance_1774626436230",
    "strainId": "Zdarma",
    "amount": 7,
    "timestamp": 1711893156319,
    "route": "oral",
    "stomach": "full",
    "note": "Zkratka: Použity P",
    "bioavailabilityMultiplier": 0.9,
    "tmaxMultiplier": 1.25
  },
  {
    "id": "92dvj1huy",
    "substanceId": "substance_1774626436230",
    "strainId": "Velo5",
    "amount": 11.5,
    "timestamp": 1711898201656,
    "route": "oral",
    "stomach": "full",
    "note": "Zkratka: Velo5",
    "bioavailabilityMultiplier": 0.9,
    "tmaxMultiplier": 1.25
  },
  {
    "id": "dose_1774974701809",
    "substanceId": "substance_1774623139275",
    "amount": 7,
    "timestamp": 1711902701809,
    "route": "oral",
    "stomach": "full",
    "note": "",
    "strainId": "Green Pure",
    "bioavailabilityMultiplier": 0.9,
    "tmaxMultiplier": 1.25
  },
  {
    "id": "rbo5rdxl1",
    "substanceId": "substance_1774626436230",
    "strainId": "Zdarma",
    "amount": 7,
    "timestamp": 1711907613747,
    "route": "oral",
    "stomach": "full",
    "note": "Zkratka: Použity P",
    "bioavailabilityMultiplier": 0.9,
    "tmaxMultiplier": 1.25
  },
  {
    "id": "5ifu1cum0",
    "substanceId": "substance_1774626436230",
    "strainId": "Velo5",
    "amount": 11.5,
    "timestamp": 1711909443432,
    "route": "oral",
    "stomach": "full",
    "note": "Zkratka: Velo5",
    "bioavailabilityMultiplier": 0.9,
    "tmaxMultiplier": 1.25
  },
  {
    "id": "1trod8gdj",
    "substanceId": "substance_1774626436230",
    "strainId": "Zdarma",
    "amount": 7,
    "timestamp": 1711913649903,
    "route": "oral",
    "stomach": "full",
    "note": "Zkratka: Použity P",
    "bioavailabilityMultiplier": 0.9,
    "tmaxMultiplier": 1.25
  },
  {
    "id": "2sbg9j538",
    "substanceId": "substance_1774626436230",
    "strainId": "Velo5",
    "amount": 11.5,
    "timestamp": 1711948943917,
    "route": "oral",
    "stomach": "full",
    "note": "Zkratka: Velo5",
    "bioavailabilityMultiplier": 0.9,
    "tmaxMultiplier": 1.25
  },
  {
    "id": "dose_1775022771702",
    "substanceId": "substance_1774623139275",
    "amount": 4,
    "timestamp": 1711950771702,
    "route": "oral",
    "stomach": "full",
    "note": "",
    "strainId": "Green Pure",
    "bioavailabilityMultiplier": 0.9,
    "tmaxMultiplier": 1.25
  },
  {
    "id": "zbhq09xzh",
    "substanceId": "substance_1774626436230",
    "strainId": "Zdarma",
    "amount": 7,
    "timestamp": 1711953357780,
    "route": "oral",
    "stomach": "full",
    "note": "Zkratka: Použity P",
    "bioavailabilityMultiplier": 0.9,
    "tmaxMultiplier": 1.25
  },
  {
    "id": "z3qtid62n",
    "substanceId": "substance_1774626436230",
    "strainId": "Velo5",
    "amount": 11.5,
    "timestamp": 1711956573258,
    "route": "oral",
    "stomach": "full",
    "note": "Zkratka: Velo5",
    "bioavailabilityMultiplier": 0.9,
    "tmaxMultiplier": 1.25
  },
  {
    "id": "dose_1775029479403",
    "substanceId": "substance_1774623139275",
    "amount": 8,
    "timestamp": 1711957479403,
    "route": "oral",
    "stomach": "full",
    "note": "",
    "strainId": "Green Pure",
    "bioavailabilityMultiplier": 0.9,
    "tmaxMultiplier": 1.25
  }
];

export const DEFAULT_SETTINGS: UserSettings = {
  "userWeight": 70,
  "userAge": 25,
  "userMetabolism": "normal",
  "userGender": "male",
  "activityLevel": "moderate",
  "timeFormat24h": true,
  "showSeconds": false,
  "compactMode": false,
  "hapticFeedback": true,
  "language": "cs",
  "currency": "Kč",
  "theme": "dark",
  "animations": true,
  "glassEffects": true,
  "glowEffects": true,
  "ambientBackground": true,
  "chartWindow": 24,
  "weeklyBudget": 1000,
  "chartAnimation": true,
  "chartGrid": true,
  "chartPoints": false,
  "predictiveAnalytics": true,
  "insightEngine": false,
  "correlationSensitivity": 50,
  "correlationBinCount": 5,
  "interactionWarnings": true,
  "doseWarnings": true,
  "reminders": false,
  "comedownWarnings": true,
  "soundAlerts": false,
  "quietHoursEnabled": false,
  "quietHoursStart": "22:00",
  "quietHoursEnd": "07:00",
  "bentoMode": true,
  "glassmorphism": true,
  "privacyMode": false,
  "fontSize": "medium",
  "colorAccent": "emerald",
  "reducedMotion": false,
  "firstDayOfWeek": 1,
  "dashboardWidgets": {
    "activeEffects": true,
    "recentDoses": true,
    "quickAdd": true,
    "budget": true,
    "systemLoad": true,
    "shortcuts": true
  },
  "autoBackup": "none",
  "pinCode": null,
  "requirePin": false
};

export const DEFAULT_EFFECTS: CustomEffect[] = [
  {
    "name": "Stimulace",
    "icon": "zap",
    "color": "#f59e0b",
    "valence": "positive"
  },
  {
    "name": "Motivace",
    "icon": "target",
    "color": "#10b981",
    "valence": "positive"
  },
  {
    "name": "Úzkost",
    "icon": "alert-circle",
    "color": "#8b5cf6",
    "valence": "negative"
  },
  {
    "name": "Chuť k jídlu",
    "icon": "utensils",
    "color": "#22c55e",
    "valence": "neutral"
  },
  {
    "name": "Koordinace",
    "icon": "move",
    "color": "#06b6d4",
    "valence": "neutral"
  },
  {
    "name": "Zácpa",
    "icon": "brain",
    "color": "#ec4899",
    "valence": "negative"
  },
  {
    "name": "Fyzická Euforie",
    "icon": "activity",
    "color": "#f43f5e",
    "valence": "positive"
  },
  {
    "name": "Psychická euforie",
    "icon": "brain",
    "color": "#3b82f6",
    "valence": "positive"
  },
  {
    "name": "Sedace",
    "icon": "sparkles",
    "color": "#f43f5e",
    "valence": "negative"
  },
  {
    "name": "Podrážděnost",
    "icon": "smile",
    "color": "#f43f5e",
    "valence": "negative"
  }
];

export const ROUTE_MULTIPLIERS: Record<string, { bioavailability: number, speed: number, tmaxMultiplier: number }> = { 
  oral: { bioavailability: 1.0, speed: 1.0, tmaxMultiplier: 1.0 }, 
  sublingual: { bioavailability: 1.2, speed: 1.5, tmaxMultiplier: 0.5 }, 
  insufflated: { bioavailability: 1.3, speed: 2.0, tmaxMultiplier: 0.3 }, 
  inhaled: { bioavailability: 1.5, speed: 3.0, tmaxMultiplier: 0.15 }, 
  intravenous: { bioavailability: 2.0, speed: 5.0, tmaxMultiplier: 0.05 }, 
  intramuscular: { bioavailability: 1.8, speed: 2.5, tmaxMultiplier: 0.3 }, 
  subcutaneous: { bioavailability: 1.6, speed: 1.8, tmaxMultiplier: 0.5 }, 
  rectal: { bioavailability: 1.4, speed: 1.3, tmaxMultiplier: 0.6 }, 
  topical: { bioavailability: 0.3, speed: 0.5, tmaxMultiplier: 3.0 } 
};

export const STOMACH_MULTIPLIERS: Record<string, { bioavailability: number, speed: number }> = { 
  empty: { bioavailability: 1.2, speed: 1.5 }, 
  light: { bioavailability: 1.0, speed: 1.0 }, 
  full: { bioavailability: 0.9, speed: 0.8 }, 
  heavy: { bioavailability: 0.7, speed: 0.5 } 
};
