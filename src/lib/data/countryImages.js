const countryImagesByName = {
    "Afghanistan": "https://cdn.sportmonks.com/images/countries/png/short/af.png",
    "Albania": "https://cdn.sportmonks.com/images/countries/png/short/al.png",
    "Algeria": "https://cdn.sportmonks.com/images/countries/png/short/dz.png",
    "American Samoa": "https://cdn.sportmonks.com/images/countries/png/short/as.png",
    "Andorra": "https://cdn.sportmonks.com/images/countries/png/short/ad.png",
    "Angola": "https://cdn.sportmonks.com/images/countries/png/short/ao.png",
    "Anguilla": "https://cdn.sportmonks.com/images/countries/png/short/ai.png",
    "Antigua and Barbuda": "https://cdn.sportmonks.com/images/countries/png/short/ag.png",
    "Argentina": "https://cdn.sportmonks.com/images/countries/png/short/ar.png",
    "Armenia": "https://cdn.sportmonks.com/images/countries/png/short/am.png",
    "Aruba": "https://cdn.sportmonks.com/images/countries/png/short/aw.png",
    "Australia": "https://cdn.sportmonks.com/images/countries/png/short/au.png",
    "Austria": "https://cdn.sportmonks.com/images/countries/png/short/at.png",
    "Azerbaijan": "https://cdn.sportmonks.com/images/countries/png/short/az.png",
    "Bahamas": "https://cdn.sportmonks.com/images/countries/png/short/bs.png",
    "Bahrain": "https://cdn.sportmonks.com/images/countries/png/short/bh.png",
    "Bangladesh": "https://cdn.sportmonks.com/images/countries/png/short/bd.png",
    "Barbados": "https://cdn.sportmonks.com/images/countries/png/short/bb.png",
    "Belarus": "https://cdn.sportmonks.com/images/countries/png/short/by.png",
    "Belgium": "https://cdn.sportmonks.com/images/countries/png/short/be.png",
    "Belize": "https://cdn.sportmonks.com/images/countries/png/short/bz.png",
    "Benin": "https://cdn.sportmonks.com/images/countries/png/short/bj.png",
    "Bermuda": "https://cdn.sportmonks.com/images/countries/png/short/bm.png",
    "Bhutan": "https://cdn.sportmonks.com/images/countries/png/short/bt.png",
    "Bolivia": "https://cdn.sportmonks.com/images/countries/png/short/bo.png",
    "Bosnia and Herzegovina": "https://cdn.sportmonks.com/images/countries/png/short/ba.png",
    "Botswana": "https://cdn.sportmonks.com/images/countries/png/short/bw.png",
    "Brazil": "https://cdn.sportmonks.com/images/countries/png/short/br.png",
    "British Virgin Islands": "https://cdn.sportmonks.com/images/countries/png/short/vi.png",
    "Brunei": "https://cdn.sportmonks.com/images/countries/png/short/bn.png",
    "Bulgaria": "https://cdn.sportmonks.com/images/countries/png/short/bg.png",
    "Burkina Faso": "https://cdn.sportmonks.com/images/countries/png/short/bf.png",
    "Burundi": "https://cdn.sportmonks.com/images/countries/png/short/bi.png",
    "Cambodia": "https://cdn.sportmonks.com/images/countries/png/short/kh.png",
    "Cameroon": "https://cdn.sportmonks.com/images/countries/png/short/cm.png",
    "Canada": "https://cdn.sportmonks.com/images/countries/png/short/ca.png",
    "Cape Verde": "https://cdn.sportmonks.com/images/countries/png/short/cv.png",
    "Caribbean Netherlands": "https://cdn.sportmonks.com/images/countries/png/short/bq.png",
    "Cayman Islands": "https://cdn.sportmonks.com/images/countries/png/short/ky.png",
    "Central African Republic": "https://cdn.sportmonks.com/images/countries/png/short/cf.png",
    "Chad": "https://cdn.sportmonks.com/images/countries/png/short/td.png",
    "Chile": "https://cdn.sportmonks.com/images/countries/png/short/cl.png",
    "China": "https://cdn.sportmonks.com/images/countries/png/short/cn.png",
    "Colombia": "https://cdn.sportmonks.com/images/countries/png/short/co.png",
    "Comoros": "https://cdn.sportmonks.com/images/countries/png/short/km.png",
    "Cook Islands": "https://cdn.sportmonks.com/images/countries/png/short/ck.png",
    "Costa Rica": "https://cdn.sportmonks.com/images/countries/png/short/cr.png",
    "Croatia": "https://cdn.sportmonks.com/images/countries/png/short/hr.png",
    "Cuba": "https://cdn.sportmonks.com/images/countries/png/short/cu.png",
    "Curaçao": "https://cdn.sportmonks.com/images/countries/png/short/cw.png",
    "Cyprus": "https://cdn.sportmonks.com/images/countries/png/short/cy.png",
    "Czech Republic": "https://cdn.sportmonks.com/images/countries/png/short/cz.png",
    "DR Congo": "https://cdn.sportmonks.com/images/countries/png/short/cd.png",
    "Denmark": "https://cdn.sportmonks.com/images/countries/png/short/dk.png",
    "Djibouti": "https://cdn.sportmonks.com/images/countries/png/short/dj.png",
    "Dominica": "https://cdn.sportmonks.com/images/countries/png/short/dm.png",
    "Dominican Republic": "https://cdn.sportmonks.com/images/countries/png/short/do.png",
    "Ecuador": "https://cdn.sportmonks.com/images/countries/png/short/ec.png",
    "Egypt": "https://cdn.sportmonks.com/images/countries/png/short/eg.png",
    "El Salvador": "https://cdn.sportmonks.com/images/countries/png/short/sv.png",
    "England": "https://cdn.sportmonks.com/images/countries/png/short/en.png",
    "Equatorial Guinea": "https://cdn.sportmonks.com/images/countries/png/short/gq.png",
    "Eritrea": "https://cdn.sportmonks.com/images/countries/png/short/er.png",
    "Estonia": "https://cdn.sportmonks.com/images/countries/png/short/ee.png",
    "Ethiopia": "https://cdn.sportmonks.com/images/countries/png/short/et.png",
    "Europe": "https://cdn.sportmonks.com/images/countries/png/short/eu.png",
    "Falkland Islands (Malvinas)": "https://cdn.sportmonks.com/images/countries/png/short/fk.png",
    "Faroe Islands": "https://cdn.sportmonks.com/images/countries/png/short/fo.png",
    "Fiji": "https://cdn.sportmonks.com/images/countries/png/short/fj.png",
    "Finland": "https://cdn.sportmonks.com/images/countries/png/short/fi.png",
    "France": "https://cdn.sportmonks.com/images/countries/png/short/fr.png",
    "French Guiana": "https://cdn.sportmonks.com/images/countries/png/short/gf.png",
    "Gabon": "https://cdn.sportmonks.com/images/countries/png/short/ga.png",
    "Gambia": "https://cdn.sportmonks.com/images/countries/png/short/gm.png",
    "Georgia": "https://cdn.sportmonks.com/images/countries/png/short/ge.png",
    "Germany": "https://cdn.sportmonks.com/images/countries/png/short/de.png",
    "Ghana": "https://cdn.sportmonks.com/images/countries/png/short/gh.png",
    "Gibraltar": "https://cdn.sportmonks.com/images/countries/png/short/gi.png",
    "Greece": "https://cdn.sportmonks.com/images/countries/png/short/gr.png",
    "Grenada": "https://cdn.sportmonks.com/images/countries/png/short/gd.png",
    "Guadeloupe": "https://cdn.sportmonks.com/images/countries/png/short/gp.png",
    "Guam": "https://cdn.sportmonks.com/images/countries/png/short/gu.png",
    "Guatemala": "https://cdn.sportmonks.com/images/countries/png/short/gt.png",
    "Guernsey": "https://cdn.sportmonks.com/images/countries/png/short/gg.png",
    "Guinea": "https://cdn.sportmonks.com/images/countries/png/short/gn.png",
    "Guinea-Bissau": "https://cdn.sportmonks.com/images/countries/png/short/gw.png",
    "Guyana": "https://cdn.sportmonks.com/images/countries/png/short/gy.png",
    "Haiti": "https://cdn.sportmonks.com/images/countries/png/short/ht.png",
    "Honduras": "https://cdn.sportmonks.com/images/countries/png/short/hn.png",
    "Hong Kong": "https://cdn.sportmonks.com/images/countries/png/short/hk.png",
    "Hungary": "https://cdn.sportmonks.com/images/countries/png/short/hu.png",
    "Iceland": "https://cdn.sportmonks.com/images/countries/png/short/is.png",
    "India": "https://cdn.sportmonks.com/images/countries/png/short/in.png",
    "Indonesia": "https://cdn.sportmonks.com/images/countries/png/short/id.png",
    "Iran": "https://cdn.sportmonks.com/images/countries/png/short/ir.png",
    "Iraq": "https://cdn.sportmonks.com/images/countries/png/short/iq.png",
    "Isle of Man": "https://cdn.sportmonks.com/images/countries/png/short/im.png",
    "Israel": "https://cdn.sportmonks.com/images/countries/png/short/il.png",
    "Italy": "https://cdn.sportmonks.com/images/countries/png/short/it.png",
    "Ivory Coast": "https://cdn.sportmonks.com/images/countries/png/short/ci.png",
    "Jamaica": "https://cdn.sportmonks.com/images/countries/png/short/jm.png",
    "Japan": "https://cdn.sportmonks.com/images/countries/png/short/jp.png",
    "Jersey": "https://cdn.sportmonks.com/images/countries/png/short/je.png",
    "Jordan": "https://cdn.sportmonks.com/images/countries/png/short/jo.png",
    "Kazakhstan": "https://cdn.sportmonks.com/images/countries/png/short/kz.png",
    "Kenya": "https://cdn.sportmonks.com/images/countries/png/short/ke.png",
    "Korea DPR": null,
    "Kosovo": "https://cdn.sportmonks.com/images/countries/png/short/xk.png",
    "Kuwait": "https://cdn.sportmonks.com/images/countries/png/short/kw.png",
    "Kyrgyz Republic": "https://cdn.sportmonks.com/images/countries/png/short/kg.png",
    "Kyrgyzstan": "https://cdn.sportmonks.com/images/countries/png/short/kg.png",
    "Laos": "https://cdn.sportmonks.com/images/countries/png/short/la.png",
    "Latvia": "https://cdn.sportmonks.com/images/countries/png/short/lv.png",
    "Lebanon": "https://cdn.sportmonks.com/images/countries/png/short/lb.png",
    "Lesotho": "https://cdn.sportmonks.com/images/countries/png/short/ls.png",
    "Liberia": "https://cdn.sportmonks.com/images/countries/png/short/lr.png",
    "Libya": "https://cdn.sportmonks.com/images/countries/png/short/ly.png",
    "Liechtenstein": "https://cdn.sportmonks.com/images/countries/png/short/li.png",
    "Lithuania": "https://cdn.sportmonks.com/images/countries/png/short/lt.png",
    "Luxembourg": "https://cdn.sportmonks.com/images/countries/png/short/lu.png",
    "Macau": "https://cdn.sportmonks.com/images/countries/png/short/mo.png",
    "Macedonia": "https://cdn.sportmonks.com/images/countries/png/short/mk.png",
    "Madagascar": "https://cdn.sportmonks.com/images/countries/png/short/mg.png",
    "Malawi": "https://cdn.sportmonks.com/images/countries/png/short/mw.png",
    "Malaysia": "https://cdn.sportmonks.com/images/countries/png/short/my.png",
    "Maldives": "https://cdn.sportmonks.com/images/countries/png/short/mv.png",
    "Mali": "https://cdn.sportmonks.com/images/countries/png/short/ml.png",
    "Malta": "https://cdn.sportmonks.com/images/countries/png/short/mt.png",
    "Martinique": "https://cdn.sportmonks.com/images/countries/png/short/mq.png",
    "Mauritania": "https://cdn.sportmonks.com/images/countries/png/short/mr.png",
    "Mauritius": "https://cdn.sportmonks.com/images/countries/png/short/mu.png",
    "Mayotte": "https://cdn.sportmonks.com/images/countries/png/short/yt.png",
    "Mexico": "https://cdn.sportmonks.com/images/countries/png/short/mx.png",
    "Moldova": "https://cdn.sportmonks.com/images/countries/png/short/md.png",
    "Monaco": "https://cdn.sportmonks.com/images/countries/png/short/mc.png",
    "Mongolia": "https://cdn.sportmonks.com/images/countries/png/short/mn.png",
    "Montenegro": "https://cdn.sportmonks.com/images/countries/png/short/me.png",
    "Montserrat": "https://cdn.sportmonks.com/images/countries/png/short/ms.png",
    "Morocco": "https://cdn.sportmonks.com/images/countries/png/short/ma.png",
    "Mozambique": "https://cdn.sportmonks.com/images/countries/png/short/mz.png",
    "Myanmar": "https://cdn.sportmonks.com/images/countries/png/short/mm.png",
    "Namibia": "https://cdn.sportmonks.com/images/countries/png/short/na.png",
    "Nepal": "https://cdn.sportmonks.com/images/countries/png/short/np.png",
    "Netherlands": "https://cdn.sportmonks.com/images/countries/png/short/nl.png",
    "New Caledonia": "https://cdn.sportmonks.com/images/countries/png/short/nc.png",
    "New Zealand": "https://cdn.sportmonks.com/images/countries/png/short/nz.png",
    "Nicaragua": "https://cdn.sportmonks.com/images/countries/png/short/ni.png",
    "Niger": "https://cdn.sportmonks.com/images/countries/png/short/ne.png",
    "Nigeria": "https://cdn.sportmonks.com/images/countries/png/short/ng.png",
    "Niue": "https://cdn.sportmonks.com/images/countries/png/short/nu.png",
    "Northern Ireland": "https://cdn.sportmonks.com/images/countries/png/short/nd.png",
    "Norway": "https://cdn.sportmonks.com/images/countries/png/short/no.png",
    "Oman": "https://cdn.sportmonks.com/images/countries/png/short/om.png",
    "Pakistan": "https://cdn.sportmonks.com/images/countries/png/short/pk.png",
    "Palestine": "https://cdn.sportmonks.com/images/countries/png/short/ps.png",
    "Panama": "https://cdn.sportmonks.com/images/countries/png/short/pa.png",
    "Papua New Guinea": "https://cdn.sportmonks.com/images/countries/png/short/pg.png",
    "Paraguay": "https://cdn.sportmonks.com/images/countries/png/short/py.png",
    "Peru": "https://cdn.sportmonks.com/images/countries/png/short/pe.png",
    "Philippines": "https://cdn.sportmonks.com/images/countries/png/short/ph.png",
    "Poland": "https://cdn.sportmonks.com/images/countries/png/short/pl.png",
    "Portugal": "https://cdn.sportmonks.com/images/countries/png/short/pt.png",
    "Puerto Rico": "https://cdn.sportmonks.com/images/countries/png/short/pr.png",
    "Qatar": "https://cdn.sportmonks.com/images/countries/png/short/qa.png",
    "Republic of Ireland": "https://cdn.sportmonks.com/images/countries/png/short/ie.png",
    "Republic of the Congo": "https://cdn.sportmonks.com/images/countries/png/short/cg.png",
    "Romania": "https://cdn.sportmonks.com/images/countries/png/short/ro.png",
    "Russia": "https://cdn.sportmonks.com/images/countries/png/short/ru.png",
    "Rwanda": "https://cdn.sportmonks.com/images/countries/png/short/rw.png",
    "Réunion": "https://cdn.sportmonks.com/images/countries/png/short/re.png",
    "Saint Kitts and Nevis": "https://cdn.sportmonks.com/images/countries/png/short/kn.png",
    "Saint Lucia": "https://cdn.sportmonks.com/images/countries/png/short/lc.png",
    "Saint Vincent and the Grenadines": "https://cdn.sportmonks.com/images/countries/png/short/vc.png",
    "Samoa": "https://cdn.sportmonks.com/images/countries/png/short/ws.png",
    "San Marino": "https://cdn.sportmonks.com/images/countries/png/short/sm.png",
    "Saudi Arabia": "https://cdn.sportmonks.com/images/countries/png/short/sa.png",
    "Scotland": "https://cdn.sportmonks.com/images/countries/png/short/scotland.png",
    "Senegal": "https://cdn.sportmonks.com/images/countries/png/short/sn.png",
    "Serbia": "https://cdn.sportmonks.com/images/countries/png/short/rs.png",
    "Seychelles": "https://cdn.sportmonks.com/images/countries/png/short/sc.png",
    "Sierra Leone": "https://cdn.sportmonks.com/images/countries/png/short/sl.png",
    "Singapore": "https://cdn.sportmonks.com/images/countries/png/short/sg.png",
    "Sint Maarten": "https://cdn.sportmonks.com/images/countries/png/short/sx.png",
    "Slovakia": "https://cdn.sportmonks.com/images/countries/png/short/sk.png",
    "Slovenia": "https://cdn.sportmonks.com/images/countries/png/short/si.png",
    "Solomon Islands": "https://cdn.sportmonks.com/images/countries/png/short/sb.png",
    "Somalia": "https://cdn.sportmonks.com/images/countries/png/short/so.png",
    "South Africa": "https://cdn.sportmonks.com/images/countries/png/short/za.png",
    "South Korea": "https://cdn.sportmonks.com/images/countries/png/short/kr.png",
    "South Sudan": "https://cdn.sportmonks.com/images/countries/png/short/ss.png",
    "Spain": "https://cdn.sportmonks.com/images/countries/png/short/es.png",
    "Sri Lanka": "https://cdn.sportmonks.com/images/countries/png/short/lk.png",
    "Sudan": "https://cdn.sportmonks.com/images/countries/png/short/sd.png",
    "Suriname": "https://cdn.sportmonks.com/images/countries/png/short/sr.png",
    "Swaziland": "https://cdn.sportmonks.com/images/countries/png/short/sz.png",
    "Sweden": "https://cdn.sportmonks.com/images/countries/png/short/se.png",
    "Switzerland": "https://cdn.sportmonks.com/images/countries/png/short/ch.png",
    "Syria": "https://cdn.sportmonks.com/images/countries/png/short/sy.png",
    "São Tomé and Príncipe": "https://cdn.sportmonks.com/images/countries/png/short/st.png",
    "Tahiti": null,
    "Taiwan": "https://cdn.sportmonks.com/images/countries/png/short/tw.png",
    "Tajikistan": "https://cdn.sportmonks.com/images/countries/png/short/tj.png",
    "Tanzania": "https://cdn.sportmonks.com/images/countries/png/short/tz.png",
    "Thailand": "https://cdn.sportmonks.com/images/countries/png/short/th.png",
    "Timor-Leste": "https://cdn.sportmonks.com/images/countries/png/short/tl.png",
    "Togo": "https://cdn.sportmonks.com/images/countries/png/short/tg.png",
    "Tonga": "https://cdn.sportmonks.com/images/countries/png/short/to.png",
    "Trinidad and Tobago": "https://cdn.sportmonks.com/images/countries/png/short/tt.png",
    "Tunisia": "https://cdn.sportmonks.com/images/countries/png/short/tn.png",
    "Turkey": "https://cdn.sportmonks.com/images/countries/png/short/tr.png",
    "Turkmenistan": "https://cdn.sportmonks.com/images/countries/png/short/tm.png",
    "Turks and Caicos Islands": "https://cdn.sportmonks.com/images/countries/png/short/tc.png",
    "Tuvalu": "https://cdn.sportmonks.com/images/countries/png/short/tv.png",
    "Uganda": "https://cdn.sportmonks.com/images/countries/png/short/ug.png",
    "Ukraine": "https://cdn.sportmonks.com/images/countries/png/short/ua.png",
    "United Arab Emirates": "https://cdn.sportmonks.com/images/countries/png/short/ae.png",
    "United States": "https://cdn.sportmonks.com/images/countries/png/short/us.png",
    "Uruguay": "https://cdn.sportmonks.com/images/countries/png/short/uy.png",
    "Uzbekistan": "https://cdn.sportmonks.com/images/countries/png/short/uz.png",
    "Vanuatu": "https://cdn.sportmonks.com/images/countries/png/short/vu.png",
    "Venezuela": "https://cdn.sportmonks.com/images/countries/png/short/ve.png",
    "Vietnam": "https://cdn.sportmonks.com/images/countries/png/short/vn.png",
    "Wales": "https://cdn.sportmonks.com/images/countries/png/short/wa.png",
    "West Indies": "https://cdn.sportmonks.com/images/countries/png/short/wi.png",
    "Yemen": "https://cdn.sportmonks.com/images/countries/png/short/ye.png",
    "Zambia": "https://cdn.sportmonks.com/images/countries/png/short/zm.png",
    "Zimbabwe": "https://cdn.sportmonks.com/images/countries/png/short/zw.png"
}

export function getCountryUrl(name) {
    const url = countryImagesByName[name];
    
    if (url) {
        return url;
    }
    
}