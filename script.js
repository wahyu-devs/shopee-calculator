function formatRupiah(angka) {
    return "Rp" + angka.toLocaleString("id-ID");
}

function formatInput(el) {
    let value = el.value.replace(/\D/g, ""); // hanya angka
    if (value === "") {
        el.value = "";
        return;
    }
    el.value = parseInt(value, 10).toLocaleString("id-ID");
}

function hitung() {
    let bersihStr = document.getElementById("bersih").value.replace(/\./g, "");
    let bersih = parseFloat(bersihStr);

    if (isNaN(bersih) || bersih <= 0) {
        alert("Masukkan angka yang valid!");
        return;
    }

    // Hitungan dasar
    let hargaFinal = (bersih + 1250) / 0.92;
    let hargaBulat = Math.ceil(hargaFinal / 100) * 100;

    // Simulasi potongan
    let admin = hargaBulat * 0.08;
    let proses = 1250;
    let diterima = hargaBulat - admin - proses;

    document.getElementById("output").style.display = "block";
    document.getElementById("output").innerHTML = `
    <div class="judul-harga-final"><b>Harga Jual di Shopee:</b></div> 
    <div class="harga-final">${formatRupiah(hargaBulat)}</div>
    <div class="potongan">
      <b>Simulasi Potongan:</b><br>
      - Biaya Admin (8%): ${formatRupiah(Math.round(admin))} <br>
      - Biaya Proses: ${formatRupiah(proses)} <br>
      - Uang Bersih Diterima: <b>${formatRupiah(Math.round(diterima))}</b>
    </div>
  `;
}
