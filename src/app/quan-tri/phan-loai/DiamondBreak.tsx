"use client";

import { useState } from "react";

const GEMS = ["💎", "🔷", "🟢", "🟣", "🟡", "🟠"];
const SIZE = 6;
const MAX_MOVES = 8;

function randomBoard() {
  let board: number[];
  do { board = Array.from({ length: SIZE * SIZE }, () => Math.floor(Math.random() * GEMS.length)); } while (matched(board).size);
  return board;
}

function matched(board: number[]) {
  const out = new Set<number>();
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE - 2; col++) {
      const i = row * SIZE + col;
      if (board[i] === board[i + 1] && board[i] === board[i + 2]) {
        let end = col + 3;
        while (end < SIZE && board[row * SIZE + end] === board[i]) end++;
        for (let x = col; x < end; x++) out.add(row * SIZE + x);
      }
    }
  }
  for (let col = 0; col < SIZE; col++) {
    for (let row = 0; row < SIZE - 2; row++) {
      const i = row * SIZE + col;
      if (board[i] === board[i + SIZE] && board[i] === board[i + SIZE * 2]) {
        let end = row + 3;
        while (end < SIZE && board[end * SIZE + col] === board[i]) end++;
        for (let y = row; y < end; y++) out.add(y * SIZE + col);
      }
    }
  }
  return out;
}

function adjacent(a: number, b: number) {
  const ar = Math.floor(a / SIZE), ac = a % SIZE;
  const br = Math.floor(b / SIZE), bc = b % SIZE;
  return Math.abs(ar - br) + Math.abs(ac - bc) === 1;
}

export default function DiamondBreak({ round, onDone }: { round: number; onDone: (score: number) => void }) {
  const [board, setBoard] = useState(randomBoard);
  const [selected, setSelected] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [score, setScore] = useState(0);
  const [message, setMessage] = useState("Chọn hai viên cạnh nhau để đổi chỗ.");

  function choose(index: number) {
    if (moves >= MAX_MOVES) return;
    if (selected === null) { setSelected(index); return; }
    if (selected === index) { setSelected(null); return; }
    if (!adjacent(selected, index)) { setSelected(index); setMessage("Hai viên phải nằm cạnh nhau."); return; }
    const next = [...board];
    [next[selected], next[index]] = [next[index], next[selected]];
    const hits = matched(next);
    setMoves((value) => value + 1);
    setSelected(null);
    if (!hits.size) { setMessage("Chưa thành hàng 3 — thử nước khác nhé!"); return; }
    // Đổi viên theo quy luật ổn định (không gọi random trong event render scope).
    for (const hit of hits) next[hit] = (next[hit] + hit + moves + 1) % GEMS.length;
    setBoard(next);
    setScore((value) => value + hits.size * 10);
    setMessage(`✨ Ăn ${hits.size} viên!`);
  }

  const finished = moves >= MAX_MOVES;
  return <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-[#071d2f]/80 p-3 backdrop-blur-sm">
    <section className="w-full max-w-md rounded-3xl border-4 border-[#79b9ef] bg-gradient-to-b from-[#102f59] to-[#071d3a] p-4 text-white shadow-2xl sm:p-5">
      <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black tracking-[.16em] text-[#9ed7ff]">GIẢI LAO SAU 10 THẺ</p><h2 className="mt-1 text-2xl font-black">💎 Ván kim cương {round}</h2></div><div className="rounded-xl bg-white/10 px-3 py-2 text-right"><p className="text-xs text-[#bfe3ff]">Điểm</p><p className="text-xl font-black">{score}</p></div></div>
      <p className="mt-2 min-h-6 text-sm text-[#d9efff]">{finished ? "Hết lượt — nhận điểm và quay lại rà dữ liệu!" : message}</p>
      <div className="mx-auto mt-3 grid aspect-square w-full max-w-[22rem] grid-cols-6 gap-1 rounded-2xl border-2 border-white/20 bg-black/20 p-2">
        {board.map((gem, index) => <button key={index} type="button" disabled={finished} onClick={() => choose(index)} aria-label={`Kim cương ô ${index + 1}`} className={`grid place-items-center rounded-lg text-2xl transition active:scale-90 sm:text-3xl ${selected === index ? "scale-105 bg-white/35 ring-2 ring-white" : "bg-white/10 hover:bg-white/20"}`}>{GEMS[gem]}</button>)}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3"><span className="font-bold text-[#bfe3ff]">Lượt: {moves}/{MAX_MOVES}</span><button type="button" onClick={() => onDone(score)} className="rounded-xl bg-[#ffd54a] px-5 py-2.5 font-black text-[#15304f]">{finished ? `Nhận ${score} điểm` : "Bỏ qua ván"} →</button></div>
    </section>
  </div>;
}
