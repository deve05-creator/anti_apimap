# 🗺️ RouteFinder (OpenStreetMap 거리 측정기)

OpenStreetMap의 **Nominatim API**와 **OSRM 라우팅 엔진**을 기반으로 개발된 실시간 장소 검색 및 거리 측정 웹 애플리케이션입니다.  
Vercel에 100% 최적화되어 있으며 별도의 빌드 과정 없이 GitHub 연동만으로 즉시 배포할 수 있습니다.

---

## ✨ 주요 기능

1. **📍 OpenStreetMap Nominatim 지오코딩 및 자동완성 검색**
   - 출발지와 도착지를 입력하면 Nominatim API를 통해 실제 존재하는 명칭과 주소를 실시간 검색하여 자동완성 목록을 제공합니다.
   - 키보드 및 마우스 클릭으로 간편하게 장소를 선택할 수 있습니다.

2. **📏 정확한 거리 측정 (도로 주행 거리 & 직선 거리)**
   - **도로 주행 거리 (OSRM Engine)**: 실제 차량 이동 경로 기반의 총 주행 거리(km)와 예상 소요시간 계산.
   - **직선 거리 (Haversine Formula)**: 두 지점 간의 수학적 대원 거리(km) 동시 제공.

3. **🗺️ 인터랙티브 지도 시각화 (Leaflet.js)**
   - 출발지(녹색 핀) 및 도착지(빨간색 핀) 마커 자동 배치.
   - 두 지점 간의 실제 도로 경로 선(Polyline) 렌더링 및 카메라 자동 화면 맞춤.

4. **🔗 "지도에서 보기" 연동 메뉴**
   - 총거리 결과 하단의 **[지도에서 보기]** 버튼을 누르면 OpenStreetMap 공식 웹사이트의 상세 길찾기 맵 화면으로 직접 연결됩니다.

5. **⚡ 사용자 편의 기능**
   - 출발지/도착지 맞바꾸기(스왑) 버튼.
   - 1클릭 빠른 추천 검색(서울역 ➔ 부산역, 강남역 ➔ 인천공항 등).
   - 반응형 디자인(모바일, 태블릿, 데스크톱 완벽 지원).

---

## 🚀 GitHub 업로드 및 Vercel 배포 가이드

### 1단계: GitHub에 코드 올리기

터미널(또는 Git Bash/PowerShell)을 열고 현재 프로젝트 폴더에서 아래 명령어를 차례대로 입력합니다:

```bash
# 1. git 초기화
git init

# 2. 모든 파일 스테이징
git add .

# 3. 커밋 생성
git commit -m "feat: OpenStreetMap Nominatim 거리측정 웹앱 완성"

# 4. 기본 브랜치를 main으로 지정
git branch -M main

# 5. 본인의 GitHub 레포지토리 주소 연결 (GitHub에서 생성한 새 레포지토리 URL 입력)
git remote add origin https://github.com/{사용자이름}/{레포지토리이름}.git

# 6. GitHub으로 푸시
git push -u origin main
```

---

### 2단계: Vercel에서 원클릭 배포하기

1. **[Vercel](https://vercel.com)** 에 접속하여 로그인합니다 (GitHub 계정으로 로그인 권장).
2. 대시보드 우측 상단의 **[Add New...]** 버튼을 누르고 **[Project]**를 선택합니다.
3. 1단계에서 업로드한 GitHub 레포지토리를 찾은 뒤 **[Import]** 버튼을 누릅니다.
4. **Configure Project** 화면에서:
   - **Framework Preset**: `Other` (또는 기본값 유지)
   - **Build Command**: 비워둠 (정적 웹앱이므로 빌드 명령어가 필요 없습니다)
   - **Output Directory**: 비워둠 (루트 폴더)
5. **[Deploy]** 버튼을 클릭합니다.
6. 10~20초 후 나만의 도메인 URL(예: `https://osm-routefinder.vercel.app`)로 즉시 서비스가 시작됩니다! 🎉

---

## 📂 프로젝트 파일 구조

```
apimap/
├── index.html         # 메인 HTML UI 구조
├── css/
│   └── style.css      # 모던 다크/글래스모피즘 스타일시트
├── js/
│   └── app.js         # Nominatim API 검색, Leaflet 지도 및 거리 계산 로직
├── vercel.json        # Vercel 배포 설정 (헤더, 캐싱, 클린 URL)
├── package.json       # 프로젝트 메타데이터 및 로컬 테스트 스크립트
├── .gitignore         # Git 제외 파일 목록
└── README.md          # 프로젝트 문서 및 배포 안내
```

---

## 🛠️ 기술 스택

- **Frontend**: HTML5, Vanilla CSS3 (Custom Design System), JavaScript (ES6+)
- **Map & Routing**:
  - [OpenStreetMap](https://www.openstreetmap.org/)
  - [Nominatim API](https://nominatim.org/) (지오코딩 & 명칭 검색)
  - [OSRM Routing API](https://project-osrm.org/) (도로 주행 경로 및 거리)
  - [Leaflet.js](https://leafletjs.com/) (반응형 대화형 지도)
- **Deployment**: [Vercel](https://vercel.com/)
