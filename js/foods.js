/* Database makanan bawaan.
 * Nilai per 100 g (minuman per 100 ml) dan merupakan PERKIRAAN rata-rata dari tabel gizi umum
 * (TKPI / USDA / tabel purin). Masakan olahan dihitung dari bahan utamanya, jadi bisa berbeda
 * dengan masakan Anda. Tambahkan makanan sendiri lewat tab "Makanan" bila perlu.
 */
(function () {
  'use strict';
  const NA = (window.NA = window.NA || {});

  NA.CATS = [
    { k: 'pokok', n: 'Makanan pokok' },
    { k: 'daging', n: 'Daging & unggas' },
    { k: 'jeroan', n: 'Jeroan' },
    { k: 'ikan', n: 'Ikan & seafood' },
    { k: 'telur', n: 'Telur & susu' },
    { k: 'nabati', n: 'Kacang & olahan kedelai' },
    { k: 'masakan', n: 'Masakan & sayur matang' },
    { k: 'sayur', n: 'Sayur' },
    { k: 'buah', n: 'Buah' },
    { k: 'minum', n: 'Minuman' },
    { k: 'camilan', n: 'Camilan' },
  ];

  /* Bobot sumber purin untuk "skor pemicu" di analisis: purin nabati dianggap
   * kurang berpengaruh pada serangan dibanding purin hewani. */
  NA.WEIGHT = { jeroan: 1, ikan: 1, daging: 1, masakan: 1, telur: 0.5, nabati: 0.5, pokok: 0.5, sayur: 0.25, buah: 0.25, minum: 1, camilan: 0.75 };

  // [id, nama, kategori, kkal, protein, karbo, lemak, serat, gula, purin(mg), label porsi, gram porsi, flag]
  // flag: 'alk' = alkohol, 'manis' = minuman manis/fruktosa, 'air' = air putih
  const RAW = [
    // Makanan pokok
    ['nasi-putih', 'Nasi putih', 'pokok', 130, 2.7, 28, 0.3, 0.4, 0.1, 18, '1 centong', 100],
    ['nasi-merah', 'Nasi merah', 'pokok', 123, 2.7, 25.6, 1, 1.8, 0.3, 25, '1 centong', 100],
    ['nasi-goreng', 'Nasi goreng', 'pokok', 175, 4.5, 25, 6.5, 1, 1.5, 30, '1 piring', 250],
    ['nasi-uduk', 'Nasi uduk', 'pokok', 170, 3, 27, 5.5, 0.5, 0.5, 22, '1 piring', 200],
    ['bubur-ayam', 'Bubur ayam', 'pokok', 85, 3.5, 12, 2.5, 0.3, 0.3, 45, '1 mangkuk', 300],
    ['mie-ayam', 'Mie ayam', 'pokok', 140, 6, 19, 4.5, 1, 1, 55, '1 mangkuk', 300],
    ['mie-instan', 'Mie instan (matang)', 'pokok', 160, 3.5, 22, 6.5, 1, 1, 30, '1 bungkus', 200],
    ['roti-tawar', 'Roti tawar', 'pokok', 265, 9, 49, 3.2, 2.7, 5, 20, '1 lembar', 30],
    ['kentang-rebus', 'Kentang rebus', 'pokok', 87, 1.9, 20, 0.1, 1.8, 0.9, 10, '1 buah sedang', 130],
    ['singkong-rebus', 'Singkong rebus', 'pokok', 146, 1.2, 34.7, 0.3, 1.4, 1.7, 20, '1 potong', 100],
    ['ubi-rebus', 'Ubi jalar rebus', 'pokok', 90, 2, 21, 0.1, 3.3, 6.5, 15, '1 buah sedang', 130],
    ['jagung-rebus', 'Jagung rebus', 'pokok', 96, 3.4, 21, 1.5, 2.4, 4.5, 52, '1 tongkol', 150],
    ['oatmeal', 'Oatmeal (matang)', 'pokok', 71, 2.5, 12, 1.5, 1.7, 0.3, 25, '1 mangkuk', 200],

    // Daging & unggas
    ['ayam-goreng-paha', 'Ayam goreng (paha)', 'daging', 250, 23, 4, 16, 0, 0, 125, '1 potong', 90],
    ['ayam-goreng-dada', 'Ayam goreng (dada)', 'daging', 230, 27, 5, 11, 0, 0, 170, '1 potong', 100],
    ['ayam-bakar', 'Ayam bakar', 'daging', 190, 25, 3, 8, 0.1, 2, 140, '1 potong', 100],
    ['ayam-tepung', 'Ayam goreng tepung (cepat saji)', 'daging', 280, 18, 10, 19, 0.3, 0, 130, '1 potong', 100],
    ['sate-ayam', 'Sate ayam + bumbu kacang', 'daging', 195, 18, 7, 11, 0.8, 3, 120, '10 tusuk', 150],
    ['rendang', 'Rendang daging sapi', 'daging', 195, 24, 5, 8.5, 0.8, 1, 125, '1 potong', 60],
    ['semur-daging', 'Semur daging', 'daging', 160, 14, 6, 9, 0.3, 4, 105, '1 porsi', 100],
    ['daging-sapi', 'Daging sapi (masak)', 'daging', 230, 26, 0, 14, 0, 0, 120, '1 potong', 80],
    ['daging-kambing', 'Daging kambing (masak)', 'daging', 250, 25, 0, 17, 0, 0, 120, '1 potong', 80],
    ['gulai-kambing', 'Gulai kambing', 'daging', 150, 11, 3, 10, 0.5, 1, 100, '1 porsi', 150],
    ['bebek', 'Daging bebek (masak)', 'daging', 240, 23, 0, 16, 0, 0, 138, '1 potong', 100],
    ['bakso', 'Bakso sapi (butir)', 'daging', 145, 9, 12, 7, 0.3, 0.5, 85, '5 butir', 150],

    // Jeroan
    ['hati-ayam', 'Hati ayam', 'jeroan', 167, 24, 0.7, 6.5, 0, 0, 312, '1 butir', 30],
    ['ampela-ayam', 'Ampela ayam', 'jeroan', 130, 22, 0, 4, 0, 0, 150, '1 butir', 30],
    ['hati-sapi', 'Hati sapi', 'jeroan', 175, 27, 4, 5, 0, 0, 300, '1 potong', 50],
    ['babat', 'Babat sapi', 'jeroan', 85, 12, 0, 3.7, 0, 0, 100, '1 porsi', 50],

    // Ikan & seafood
    ['ikan-nila', 'Ikan nila (goreng/kukus)', 'ikan', 128, 26, 0, 2.7, 0, 0, 110, '1 ekor sedang', 120],
    ['ikan-lele', 'Ikan lele goreng', 'ikan', 230, 17, 6, 15, 0, 0, 130, '1 ekor', 100],
    ['ikan-kembung', 'Ikan kembung', 'ikan', 140, 21, 0, 6, 0, 0, 145, '1 ekor', 80],
    ['ikan-tongkol', 'Ikan tongkol', 'ikan', 130, 25, 0, 3, 0, 0, 200, '1 potong', 80],
    ['ikan-salmon', 'Ikan salmon', 'ikan', 208, 20, 0, 13, 0, 0, 170, '1 potong', 100],
    ['pepes-ikan', 'Pepes ikan', 'ikan', 130, 18, 3, 5, 0.5, 0.5, 130, '1 bungkus', 100],
    ['sarden', 'Sarden kaleng', 'ikan', 200, 22, 2, 11, 0, 0, 345, '1/2 kaleng', 70],
    ['teri-goreng', 'Ikan teri goreng', 'ikan', 330, 45, 5, 14, 0, 0, 410, '1 genggam kecil', 15],
    ['ikan-asin', 'Ikan asin goreng', 'ikan', 270, 40, 0, 12, 0, 0, 300, '1 potong', 30],
    ['udang', 'Udang (rebus/tumis)', 'ikan', 99, 24, 0.2, 0.3, 0, 0, 150, '5 ekor', 60],
    ['cumi', 'Cumi (rebus/tumis)', 'ikan', 92, 16, 3, 1.4, 0, 0, 150, '1 porsi', 80],
    ['kepiting', 'Kepiting', 'ikan', 97, 19, 0, 1.5, 0, 0, 150, '1 porsi', 100],
    ['kerang', 'Kerang', 'ikan', 90, 14, 4, 2, 0, 0, 140, '1 porsi', 100],

    // Telur & susu
    ['telur-rebus', 'Telur ayam rebus', 'telur', 155, 12.6, 1.1, 10.6, 0, 1.1, 5, '1 butir', 50],
    ['telur-dadar', 'Telur dadar', 'telur', 190, 12, 1.5, 15, 0, 1, 5, '1 butir', 60],
    ['telur-puyuh', 'Telur puyuh rebus', 'telur', 158, 13, 0.4, 11, 0, 0.4, 5, '5 butir', 50],
    ['susu-sapi', 'Susu sapi', 'telur', 61, 3.2, 4.8, 3.3, 0, 4.8, 1, '1 gelas', 200],
    ['yogurt', 'Yogurt plain', 'telur', 61, 3.5, 4.7, 3.3, 0, 4.7, 5, '1 cup', 150],
    ['susu-kedelai', 'Susu kedelai', 'telur', 54, 3.3, 6, 1.8, 0.5, 4, 30, '1 gelas', 200],

    // Kacang & olahan kedelai
    ['tempe-kukus', 'Tempe (kukus/rebus)', 'nabati', 193, 20, 7.6, 10.8, 1.4, 0, 141, '2 potong', 50],
    ['tempe-goreng', 'Tempe goreng', 'nabati', 300, 18, 10, 21, 1.4, 0, 140, '2 potong', 50],
    ['tahu-putih', 'Tahu putih', 'nabati', 76, 8, 1.9, 4.8, 0.3, 0.6, 68, '1 potong', 80],
    ['tahu-goreng', 'Tahu goreng', 'nabati', 270, 17, 7, 20, 1.5, 1, 70, '2 potong', 80],
    ['oncom', 'Oncom', 'nabati', 180, 13, 22, 6, 4, 1, 100, '1 potong', 40],
    ['kacang-tanah', 'Kacang tanah sangrai', 'nabati', 570, 25, 21, 49, 8, 4, 79, '1 genggam', 30],
    ['kacang-hijau', 'Kacang hijau rebus', 'nabati', 105, 7, 19, 0.4, 7.6, 2, 80, '1 mangkuk kecil', 100],
    ['melinjo', 'Melinjo (biji)', 'nabati', 66, 5, 13, 0.7, 1.5, 1, 366, '3 sdm', 30],
    ['emping', 'Emping melinjo goreng', 'nabati', 400, 10, 62, 13, 3, 1, 222, '1 genggam', 15],

    // Masakan & sayur matang
    ['opor-ayam', 'Opor ayam', 'masakan', 150, 11, 4, 10, 0.5, 1, 90, '1 porsi', 150],
    ['soto-ayam', 'Soto ayam (kuah + isi)', 'masakan', 60, 5, 4, 3, 0.4, 0.5, 50, '1 mangkuk', 300],
    ['rawon', 'Rawon', 'masakan', 70, 6.5, 3, 4, 0.5, 0.5, 70, '1 mangkuk', 300],
    ['sop-iga', 'Sop iga / buntut', 'masakan', 90, 8, 3, 5, 0.5, 1, 80, '1 mangkuk', 300],
    ['gado-gado', 'Gado-gado', 'masakan', 150, 6.5, 12, 8.5, 3, 4, 55, '1 porsi', 250],
    ['pecel', 'Pecel sayur', 'masakan', 140, 5.5, 14, 7.5, 3.5, 4, 60, '1 porsi', 250],
    ['sayur-asem', 'Sayur asem', 'masakan', 30, 1, 6, 0.5, 1.5, 3, 40, '1 mangkuk', 250],
    ['sayur-lodeh', 'Sayur lodeh', 'masakan', 70, 2, 7, 4, 1.5, 2.5, 45, '1 mangkuk', 250],
    ['capcay', 'Capcay', 'masakan', 70, 4, 7, 3, 1.5, 2.5, 50, '1 porsi', 200],
    ['urap', 'Urap sayur', 'masakan', 130, 4, 10, 8, 3.5, 3, 45, '1 porsi', 100],
    ['tumis-kangkung', 'Tumis kangkung', 'masakan', 55, 2, 4, 3.5, 2, 1, 50, '1 porsi', 100],
    ['bayam-bening', 'Sayur bayam bening', 'masakan', 25, 2, 3, 0.5, 1.3, 0.5, 40, '1 mangkuk', 200],

    // Sayur
    ['bayam', 'Bayam (rebus)', 'sayur', 23, 2.9, 3.6, 0.4, 2.2, 0.4, 57, '1 mangkuk', 100],
    ['kangkung', 'Kangkung (rebus)', 'sayur', 19, 2.6, 3.1, 0.2, 2.1, 0.5, 50, '1 mangkuk', 100],
    ['kembang-kol', 'Kembang kol', 'sayur', 25, 1.9, 5, 0.3, 2, 1.9, 51, '1 mangkuk', 100],
    ['brokoli', 'Brokoli', 'sayur', 34, 2.8, 6.6, 0.4, 2.6, 1.7, 70, '1 mangkuk', 100],
    ['daun-singkong', 'Daun singkong (rebus)', 'sayur', 65, 6, 11, 1, 3, 0.5, 50, '1 porsi', 100],
    ['kol', 'Kubis / kol', 'sayur', 25, 1.3, 5.8, 0.1, 2.5, 3.2, 25, '1 mangkuk', 100],
    ['wortel', 'Wortel', 'sayur', 41, 0.9, 9.6, 0.2, 2.8, 4.7, 17, '1 buah', 70],
    ['tomat', 'Tomat', 'sayur', 18, 0.9, 3.9, 0.2, 1.2, 2.6, 11, '1 buah', 100],
    ['timun', 'Timun', 'sayur', 15, 0.7, 3.6, 0.1, 0.5, 1.7, 7, '1/2 buah', 100],
    ['terong', 'Terong', 'sayur', 25, 1, 5.9, 0.2, 3, 3.5, 21, '1 buah', 100],
    ['buncis', 'Buncis / kacang panjang', 'sayur', 31, 1.8, 7, 0.2, 2.7, 3.3, 37, '1 mangkuk', 100],
    ['sawi', 'Sawi hijau', 'sayur', 27, 2.9, 4.7, 0.4, 3.2, 1.2, 30, '1 mangkuk', 100],
    ['labu-siam', 'Labu siam', 'sayur', 19, 0.8, 4.5, 0.1, 1.7, 1.7, 10, '1 mangkuk', 100],
    ['jamur-tiram', 'Jamur tiram', 'sayur', 33, 3.3, 6, 0.4, 2.3, 1, 55, '1 mangkuk', 100],
    ['jamur-kancing', 'Jamur kancing', 'sayur', 22, 3.1, 3.3, 0.3, 1, 2, 58, '1 mangkuk', 100],

    // Buah
    ['pisang', 'Pisang', 'buah', 89, 1.1, 22.8, 0.3, 2.6, 12.2, 3, '1 buah', 80],
    ['apel', 'Apel', 'buah', 52, 0.3, 14, 0.2, 2.4, 10.4, 14, '1 buah', 150],
    ['jeruk', 'Jeruk', 'buah', 47, 0.9, 11.8, 0.1, 2.4, 9.4, 19, '1 buah', 130],
    ['pepaya', 'Pepaya', 'buah', 43, 0.5, 11, 0.3, 1.7, 7.8, 12, '1 potong', 150],
    ['mangga', 'Mangga', 'buah', 60, 0.8, 15, 0.4, 1.6, 13.7, 10, '1 buah', 200],
    ['semangka', 'Semangka', 'buah', 30, 0.6, 7.6, 0.2, 0.4, 6.2, 8, '1 potong', 200],
    ['nanas', 'Nanas', 'buah', 50, 0.5, 13, 0.1, 1.4, 9.9, 10, '1 potong', 100],
    ['alpukat', 'Alpukat', 'buah', 160, 2, 8.5, 14.7, 6.7, 0.7, 19, '1/2 buah', 100],
    ['jambu-biji', 'Jambu biji', 'buah', 68, 2.6, 14, 1, 5.4, 8.9, 15, '1 buah', 100],

    // Minuman (per 100 ml)
    ['air-putih', 'Air putih', 'minum', 0, 0, 0, 0, 0, 0, 0, '1 gelas', 250, 'air'],
    ['teh-tawar', 'Teh tawar', 'minum', 1, 0, 0.3, 0, 0, 0, 0, '1 gelas', 200],
    ['teh-manis', 'Teh manis', 'minum', 25, 0.1, 6.3, 0, 0, 6, 1, '1 gelas', 200, 'manis'],
    ['kopi-hitam', 'Kopi hitam (tanpa gula)', 'minum', 2, 0.3, 0, 0, 0, 0, 2, '1 cangkir', 150],
    ['kopi-susu', 'Kopi susu gula', 'minum', 50, 1.5, 8, 1.5, 0, 7.5, 3, '1 gelas', 200, 'manis'],
    ['soda', 'Minuman bersoda', 'minum', 42, 0, 10.6, 0, 0, 10.6, 0, '1 kaleng', 330, 'manis'],
    ['jus-jeruk', 'Jus jeruk', 'minum', 45, 0.7, 10.4, 0.2, 0.2, 8.4, 10, '1 gelas', 250, 'manis'],
    ['minuman-manis', 'Minuman manis kemasan / sirup', 'minum', 50, 0, 12.5, 0, 0, 12, 0, '1 gelas', 250, 'manis'],
    ['air-kelapa', 'Air kelapa', 'minum', 19, 0.7, 3.7, 0.2, 1.1, 2.6, 0, '1 gelas', 250],
    ['bir', 'Bir', 'minum', 43, 0.5, 3.6, 0, 0, 0, 8, '1 botol', 330, 'alk'],
    ['alkohol', 'Minuman beralkohol (wine/spirit)', 'minum', 85, 0, 2.6, 0, 0, 1, 0, '1 gelas', 150, 'alk'],

    // Camilan
    ['bakwan', 'Bakwan sayur goreng', 'camilan', 220, 4, 24, 12, 1.5, 2, 40, '1 buah', 50],
    ['pisang-goreng', 'Pisang goreng', 'camilan', 230, 2, 33, 10, 1.5, 15, 10, '1 buah', 60],
    ['kerupuk', 'Kerupuk', 'camilan', 480, 4, 75, 18, 1, 1, 20, '3 lembar', 15],
    ['bubur-kacang-hijau', 'Bubur kacang hijau (manis)', 'camilan', 110, 3, 22, 1.5, 3, 12, 40, '1 mangkuk', 200],
    ['perkedel', 'Perkedel kentang', 'camilan', 190, 4, 18, 11, 1.2, 1, 25, '1 buah', 50],
  ];


  // Natrium (mg), kolesterol (mg), lemak jenuh (g) per 100 g/ml. Perkiraan rata-rata.
  const EXTRA = {
    'nasi-putih':[1,0,0.1],'nasi-merah':[3,0,0.2],'nasi-goreng':[350,45,1.8],'nasi-uduk':[200,2,3.5],'bubur-ayam':[300,12,0.8],'mie-ayam':[380,25,1.3],'mie-instan':[600,0,3],'roti-tawar':[490,0,0.7],'kentang-rebus':[5,0,0],'singkong-rebus':[14,0,0.1],'ubi-rebus':[30,0,0],'jagung-rebus':[15,0,0.2],'oatmeal':[5,0,0.3],
    'ayam-goreng-paha':[380,110,4.5],'ayam-goreng-dada':[350,95,3],'ayam-bakar':[320,95,2.2],'ayam-tepung':[550,90,4.5],'sate-ayam':[420,65,3],'rendang':[450,80,4],'semur-daging':[420,50,3],'daging-sapi':[60,90,5.5],'daging-kambing':[75,95,6.5],'gulai-kambing':[380,55,5],'bebek':[75,85,5.5],'bakso':[450,35,3],
    'hati-ayam':[75,560,1.8],'ampela-ayam':[60,240,1.1],'hati-sapi':[75,390,1.7],'babat':[90,200,1.2],
    'ikan-nila':[55,70,1],'ikan-lele':[250,80,3.5],'ikan-kembung':[90,70,1.8],'ikan-tongkol':[70,60,1],'ikan-salmon':[60,63,3],'pepes-ikan':[300,60,1.5],'sarden':[400,140,3],'teri-goreng':[1500,300,3],'ikan-asin':[5000,200,3],'udang':[220,190,0.1],'cumi':[260,230,0.4],'kepiting':[350,80,0.2],'kerang':[300,50,0.3],
    'telur-rebus':[124,373,3.3],'telur-dadar':[300,350,4],'telur-puyuh':[130,470,3.6],'susu-sapi':[43,10,1.9],'yogurt':[46,13,2],'susu-kedelai':[12,0,0.2],
    'tempe-kukus':[9,0,2.3],'tempe-goreng':[200,0,3.5],'tahu-putih':[7,0,0.7],'tahu-goreng':[300,0,3],'oncom':[60,0,1.5],'kacang-tanah':[10,0,6.8],'kacang-hijau':[5,0,0.1],'melinjo':[5,0,0.1],'emping':[200,0,2],
    'opor-ayam':[350,45,5],'soto-ayam':[330,20,1.2],'rawon':[320,25,1.6],'sop-iga':[300,30,2],'gado-gado':[380,25,2.5],'pecel':[370,0,1.8],'sayur-asem':[250,0,0.3],'sayur-lodeh':[280,0,3],'capcay':[300,15,0.7],'urap':[220,0,5],'tumis-kangkung':[320,0,0.8],'bayam-bening':[250,0,0.1],
    'bayam':[70,0,0.1],'kangkung':[65,0,0],'kembang-kol':[30,0,0],'brokoli':[33,0,0.1],'daun-singkong':[10,0,0.2],'kol':[18,0,0],'wortel':[69,0,0],'tomat':[5,0,0],'timun':[2,0,0],'terong':[2,0,0],'buncis':[6,0,0],'sawi':[20,0,0],'labu-siam':[2,0,0],'jamur-tiram':[18,0,0.1],'jamur-kancing':[5,0,0],
    'pisang':[1,0,0.1],'apel':[1,0,0],'jeruk':[0,0,0],'pepaya':[8,0,0.1],'mangga':[1,0,0.1],'semangka':[1,0,0],'nanas':[1,0,0],'alpukat':[7,0,2.1],'jambu-biji':[2,0,0.3],
    'air-putih':[0,0,0],'teh-tawar':[1,0,0],'teh-manis':[2,0,0],'kopi-hitam':[2,0,0],'kopi-susu':[15,4,0.9],'soda':[10,0,0],'jus-jeruk':[1,0,0],'minuman-manis':[5,0,0],'air-kelapa':[105,0,0.2],'bir':[4,0,0],'alkohol':[5,0,0],
    'bakwan':[350,15,2],'pisang-goreng':[80,0,3],'kerupuk':[1000,0,5],'bubur-kacang-hijau':[20,0,1],'perkedel':[250,20,2.5]
  };

  NA.FOODS = RAW.map(function (r) {
    const x = EXTRA[r[0]];
    if (!x) throw new Error('Data natrium/kolesterol belum ada untuk ' + r[0]);
    return { na: x[0], ch: x[1], sf: x[2], id: r[0], name: r[1], cat: r[2], kcal: r[3], p: r[4], c: r[5], f: r[6], fi: r[7], s: r[8], pu: r[9], pl: r[10], pg: r[11], flag: r[12] || '', builtin: true };
  });
})();
