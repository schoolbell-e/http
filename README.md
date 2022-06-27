# @schoolbell-e/http
<a target="_blank" href="https://github.com/capacitor-community/http#readme">@capacitor-community/http</a>의 안드로이드 기기에서의 문제를 임시로 해결하기 위해 포크하여 수정한 레포지터리

## 문제 
파일 다운로드 시 진행 상황을 표기하기 위하여 달아둔 progress 이벤트 리스너가 안드로이드에서 너무 많이 발생하면서 전체 앱까지 느려지는 상황

## 설치
```terminal
npm i git+https://github.com/schoolbell-e/http.git
```

## 참고
- Throttle Listener PR (https://github.com/capacitor-community/http/pull/195)
- 이슈 재등록 (https://github.com/capacitor-community/http/issues/267)
