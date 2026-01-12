import re
import csv
from pathlib import Path

# --- paramètres ---
INPUT_FILE = "ccvm2questions.txt"
OUTPUT_FILE = "ccvm-banque-questions.csv"

def clean_text(s: str) -> str:
    if not s:
        return s
    # Normalisation des espaces
    s = " ".join(s.split())
    # Corrections linguistiques ciblées
    s = s.replace("OCRCVM", "OCRI")
    s = re.sub(r"risque pays", "risque-pays", s, flags=re.IGNORECASE)
    s = re.sub(r"opportunités d[’']investissement",n "possibilités d'investissement", s, flags=re.IGNORECASE)
    return s

def split_chapters(text: str):
    """
    Retourne une liste de tuples (chap_num, chap_text)
    """
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    chap_pattern = re.compile(r"^(ChapitreS?\s+(\d+))\s*$", re.MULTILINE | re.IGNORECASE)

    chapters = []
    matches = list(chap_pattern.finditer(text))
    for i, m in enumerate(matches):
        chap_num = int(m.group(2))
        start = m.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        chap_text = text[start:end].strip()
        chapters.append((chap_num, chap_text))
    return chapters

def split_questions_in_chapter(chap_text: str):
    """
    Coupe un bloc de chapitre en blocs de questions (listes de lignes)
    """
    lines = chap_text.split("\n")

    question_blocks = []
    current_start = None
    saw_question = False

    def is_option_line(line: str) -> bool:
        line = line.strip()
        return bool(re.match(r"^(✅|✔)?\s*[a-d]\)", line))

    for i, raw_line in enumerate(lines):
        line = raw_line.rstrip("\n")

        # Ignore lignes vides
        if not line.strip():
            continue

        # Ligne d'instructions spéciale à ne pas traiter comme question
        if line.strip().lower().startswith("veuillez utiliser"):
            continue

        # Début de question ?
        starts_with_num = bool(re.match(r"^\d+\.\s", line.strip()))
        is_first_question_candidate = (not saw_question and not is_option_line(line))

        if starts_with_num or is_first_question_candidate:
            # Si on a déjà une question en cours, on ferme le bloc précédent
            if current_start is not None:
                block = lines[current_start:i]
                if any(l.strip() for l in block):
                    question_blocks.append(block)
            current_start = i
            saw_question = True

    # Dernier bloc
    if current_start is not None:
        block = lines[current_start:]
        if any(l.strip() for l in block):
            question_blocks.append(block)

    return question_blocks

def parse_question_block(block_lines, chap_num, local_index):
    """
    Transforme un bloc de lignes en une ligne CSV :
    (id, chapter, question, option_a..d, correct_option, explanation)
    """
    # Texte brut du bloc, pour info
    # print("---\n", "\n".join(block_lines))

    question_parts = []
    options = {"A": "", "B": "", "C": "", "D": ""}
    correct_letter = ""

    def is_option_line(line: str) -> bool:
        return bool(re.match(r"^(✅|✔)?\s*[a-d]\)", line.strip()))

    # 1) Question : toutes les lignes du début jusqu’à la première option
    option_started = False
    for line in block_lines:
        if not line.strip():
            continue
        if is_option_line(line):
            option_started = True
            continue  # on sort de cette boucle, on traitera les options ensuite
        if not option_started:
            # Ligne de question
            m = re.match(r"^\d+\.\s*(.+)$", line.strip())
            if m:
                question_parts.append(m.group(1))
            else:
                question_parts.append(line.strip())

    question_text = clean_text(" ".join(question_parts))

    # 2) Options et bonne réponse
    letters_order = ["A", "B", "C", "D"]
    seen_letters = set()

    for line in block_lines:
        line_stripped = line.strip()
        m = re.match(r"^(✅|✔)?\s*([a-d])\)\s*(.+)$", line_stripped)
        if not m:
            continue
        mark, letter, opt_text = m.groups()
        letter_up = letter.upper()
        opt_text_clean = clean_text(opt_text)

        options[letter_up] = opt_text_clean
        seen_letters.add(letter_up)
        if mark and not correct_letter:
            correct_letter = letter_up

    # 3) ID de question et chapitre
    qid = f"Q{chap_num}-{local_index}"
    chapter_label = f"Chapitre {chap_num}"

    # 4) Pas d’explication pour cette banque
    explanation = ""

    return [
        qid,
        chapter_label,
        question_text,
        options["A"],
        options["B"],
        options["C"],
        options["D"],
        correct_letter,
        explanation,
    ]

def main():
    text = Path(INPUT_FILE).read_text(encoding="utf-8")
    chapters = split_chapters(text)

    rows = []
    for chap_num, chap_text in chapters:
        question_blocks = split_questions_in_chapter(chap_text)
        local_index = 1
        for block in question_blocks:
            row = parse_question_block(block, chap_num, local_index)
            rows.append(row)
            local_index += 1

    # Écriture du CSV
    with open(OUTPUT_FILE, "w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow([
            "id",
            "chapter",
            "question",
            "option_a",
            "option_b",
            "option_c",
            "option_d",
            "correct_option",
            "explanation",
        ])
        writer.writerows(rows)

    print(f"Écrit {len(rows)} questions dans {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
