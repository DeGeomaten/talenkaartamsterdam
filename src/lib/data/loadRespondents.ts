import * as XLSX from "xlsx";

export type Locatie = {
    id: number;
    naam: string;
    coordinaten: [number, number];
    type: "school" | "bibliotheek" | "cultureel";
    stadsdeel: string;
};

export type Respondent = {
    respondentId: number;
    locationName: string;
    stadsdeel: string;
    postcode: string;
    languages: RespondentLanguage[];
}

export type RespondentLanguage = {
    code: string;
    nameNL: string;
    nameEN: string;
    properties: {
        [key: string]: boolean;
    }
}

export async function loadData(locale: "nl" | "en" = "nl") {
    const res = await fetch("./TALENKAART_DATA/talenkaart_data.xlsx");
    const buffer = await res.arrayBuffer();
    const workbook = XLSX.read(buffer);

    // 1. Talen sheet inlezen voor "vertalingen van talen" (ISO 639-3 > NL + EN)
    const talenSheet = XLSX.utils.sheet_to_json<{ "ISO 639-3": string, NL: string, EN: string }>(workbook.Sheets["Talen"]);
    const talenMap = new Map(talenSheet.map(t => [t["ISO 639-3"], { nl: t.NL, en: t.EN }]));


    // 2. Locaties inlezen
    const locatiesRaw = XLSX.utils.sheet_to_json<any>(workbook.Sheets["Locaties"]);
    const locations: Locatie[] = locatiesRaw
        .filter(l => l.Coordinaten)
        .map((l, i) => ({
            id: i + 1,
            naam: l.Naam,
            coordinaten: l.Coordinaten.split(',').map((c: string) => parseFloat(c.trim())) as [number, number],
            stadsdeel: l.Stadsdeel,
            type: l.Type.toLowerCase() as "school" | "bibliotheek" | "cultureel"
        }));

    // 3. Respondenten inlezen
    const respondentenSheet = XLSX.utils.sheet_to_json<any[]>(workbook.Sheets["Respondenten"], { header: 1 });
    const [header, ...rows] = respondentenSheet;

    const talenPropertyRows = Object.fromEntries(header
        .map((h, i) => [h, i] as [string, number])
        .filter(h => h[0].toLowerCase().includes("talen") && !h[0].toLowerCase().includes("alle"))
        .map(h => [h[0].toLowerCase().replace('talen (', '').slice(0, -1), h[1]]));

    const talenPropertiesActive = Object.fromEntries(Object.keys(talenPropertyRows).map(i => [i, false]));

    const respondents: Respondent[] = rows
        .filter((row, index) => {
            const locationName = row[0];
            if (!locations.find(l => l.naam == locationName)) {
                console.warn(`Respondent #${index + 2}: Locatie niet gevonden: ${locationName}`);
                return false;
            }
            return true;
        })
        .map((row, index) => {
            const locationName = row[0];
            const stadsdeel = row[1];
            const postcode = row[2] || "";

            const alleTalenIndex = header.findIndex(h => h.toLowerCase().includes("talen") && h.toLowerCase().includes("alle"));
            const alle = (row[alleTalenIndex] || "").split(",").map((s: string) => s.trim()).filter(Boolean);

            for (let prop in talenPropertyRows) {
                const talenInRow = (row[talenPropertyRows[prop]] || "").split(",").map((s: string) => s.trim()).filter(Boolean);
                if (talenInRow.length) talenPropertiesActive[prop] = true;
                for (let taal of talenInRow) {
                    if (!alle.includes(taal)) {
                        console.warn(`Respondent #${index + 2}: Taal '${taal}' staat niet in "Alle talen" kolom`);
                        alle.push(taal);
                    }
                }
            }

            const uniekeTalen = Array.from(new Set(alle));
            if (uniekeTalen.length < alle.length) {
                const duplicates = alle.filter((t: string, i: number) => alle.indexOf(t) !== i);
                console.warn(`Respondent #${index + 2}: Dubbele talen gevonden en verwijderd in "Alle talen": ${duplicates.join(", ")}`);
            }


            const languages: RespondentLanguage[] = uniekeTalen
                .filter(code => {
                    if (!talenMap.has(code)) {
                        console.warn(`Respondent #${index + 2}: Taal niet gevonden: ${code}`);
                        return false;
                    }
                    return true;
                })
                .map(code => {
                    const vertaling = talenMap.get(code);
                    const props = {} as { [key: string]: boolean };
                    for (let [prop, i] of Object.entries(talenPropertyRows)) {
                        const talenInRow = (row[i] || "").split(",").map((s: string) => s.trim()).filter(Boolean);
                        props[prop] = talenInRow.includes(code);
                    }

                    return {
                        code: code,
                        nameNL: vertaling?.nl || code,
                        nameEN: vertaling?.en || code,
                        properties: props
                    };
                });

            return {
                respondentId: index + 1,
                locationName,
                stadsdeel,
                postcode,
                languages
            };
        });

    const languageFilters = Object.fromEntries(Object.keys(talenPropertiesActive)
        .filter(prop => talenPropertiesActive[prop])
        .map(prop => [prop, false]));

    return { locations, respondents, languageFilters };
}