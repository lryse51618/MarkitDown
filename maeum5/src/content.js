// 화면에 나오는 콘텐츠. 자료조사 담당은 이 파일만 고치면 된다.
// 규칙: 화면 문구에 '처방'·'치료'·'완화'를 쓰지 않는다 (lib.test.js가 검사).

export const PERSONAS = {
  A: {
    id: 'A', name: '민준', age: 28, label: '취준생',
    summary: '취업 준비 3년째. 서류 탈락이 이어지며 늦잠과 무기력이 반복돼요.',
    pattern:
      '새벽 2~3시에 자고 10~11시에 일어나요(수면 5~9시간으로 들쭉날쭉). 눈 뜨자마자 채용 메일과 동기들 SNS를 보고 침대 위에서 무기력해져요. ' +
      '오후엔 도서관에서 커피 1~2잔. 자정 넘어 혼자 방에 있으면 외로움과 비교가 커져요. 서류 탈락 문자를 받은 날이 가장 힘들어요.',
  },
  B: {
    id: 'B', name: '서연', age: 21, label: '대학생',
    summary: '대학교 3학년. 과제·발표·알바가 겹쳐 잠이 짧고 카페인에 기대요.',
    pattern:
      '평일엔 4~6시간, 주말엔 몰아서 8~9시간 자요. 아메리카노와 에너지드링크를 하루 3~5잔, 저녁 8시 넘어서도 마셔요. ' +
      '수업·발표 전 낮과 마감을 앞둔 자정 무렵 불안이 커져요. 저녁 카페 알바에서 무리한 손님을 만나면 울분이 올라와요.',
  },
};

export const LEVELS = {
  A: '이 행동을 직접 다룬 메타분석이 있어요',
  B: '이 행동을 직접 다룬 실험 연구가 있어요',
  C: '원리 근거예요 — 이 동작 자체를 검증한 연구는 없어요',
};

const R = {
  cuijpers: ['Cuijpers, P., van Straten, A., & Warmerdam, L. (2007). Behavioral activation treatments of depression: A meta-analysis. Clinical Psychology Review, 27(3), 318–326.', '활동을 계획하고 실행하는 행동 활성화 프로그램이 우울감 감소와 관련 (메타분석).'],
  ekers: ['Ekers, D., Webster, L., Van Straten, A., Cuijpers, P., Richards, D., & Gilbody, S. (2014). Behavioural activation for depression; an update of meta-analysis of effectiveness and sub group analysis. PLoS ONE, 9(6), e100100.', '후속 메타분석에서도 행동 활성화의 효과가 다시 확인됨.'],
  gollwitzer: ['Gollwitzer, P. M., & Sheeran, P. (2006). Implementation intentions and goal achievement: A meta-analysis of effects and processes. Advances in Experimental Social Psychology, 38, 69–119.', '"눈 뜨면 → 발가락"처럼 상황에 묶은 구체적 계획이 실행률을 높임 (메타분석).'],
  thayer: ['Thayer, R. E. (1987). Energy, tiredness, and tension effects of a sugar snack versus moderate exercise. Journal of Personality and Social Psychology, 52(1), 119–125.', '10분 빠르게 걷기 뒤 활력이 오르고 긴장이 내려감. 설탕 간식은 1시간 뒤 피로가 더 커짐 (실험).'],
  noetel: ['Noetel, M., et al. (2024). Effect of exercise for depression: systematic review and network meta-analysis of randomised controlled trials. BMJ, 384, e075847.', '걷기·조깅·요가·근력운동이 우울감 감소와 관련 (RCT 네트워크 메타분석).'],
  singh: ['Singh, B., et al. (2023). Effectiveness of physical activity interventions for improving depression, anxiety and distress: an overview of systematic reviews. British Journal of Sports Medicine, 57(18), 1203–1209.', '신체활동이 우울·불안·심리적 고통 감소와 관련 (체계적 문헌고찰 종합).'],
  breines: ['Breines, J. G., & Chen, S. (2012). Self-compassion increases self-improvement motivation. Personality and Social Psychology Bulletin, 38(9), 1133–1143.', '실패 뒤 자기연민 글쓰기를 한 집단이 개선 동기가 더 높고 재시험 공부를 더 오래 함 (실험).'],
  ferrari: ['Ferrari, M., Hunt, C., Harrysunker, A., Abbott, M. J., Beath, A. P., & Einstein, D. A. (2019). Self-compassion interventions and psychosocial outcomes: A meta-analysis of RCTs. Mindfulness, 10(8), 1455–1473.', '자기연민 프로그램이 자기비판·우울감·스트레스 감소와 관련 (RCT 메타분석).'],
  balban: ['Balban, M. Y., Neri, E., Kogon, M. M., Weed, L., Nouriani, B., Jo, B., Holl, G., Zeitzer, J. M., Spiegel, D., & Huberman, A. D. (2023). Brief structured respiration practices enhance mood and reduce physiological arousal. Cell Reports Medicine, 4(1), 100895.', '하루 5분 호흡 연습(박스 호흡 포함)을 한 달 하자 긍정 정서가 오르고 안정 시 호흡수가 내려감 (RCT).'],
  balbanSigh: ['Balban, M. Y., et al. (2023). Brief structured respiration practices enhance mood and reduce physiological arousal. Cell Reports Medicine, 4(1), 100895.', '날숨을 길게 하는 "주기적 한숨"이 마음챙김 명상보다 긍정 정서 상승과 호흡수 감소가 컸음 (RCT).'],
  zaccaro: ['Zaccaro, A., Piarulli, A., Laurino, M., Garbella, E., Menicucci, D., Neri, B., & Gemignani, A. (2018). How breath-control can change your life: A systematic review on psycho-physiological correlates of slow breathing. Frontiers in Human Neuroscience, 12, 353.', '분당 10회 미만의 느린 호흡이 부교감 활동·심박변이도 증가, 불안·각성 감소와 관련 (체계적 문헌고찰).'],
  ma: ['Ma, X., Yue, Z.-Q., Gong, Z.-Q., Zhang, H., Duan, N.-Y., Shi, Y.-T., Wei, G.-X., & Li, Y.-F. (2017). The effect of diaphragmatic breathing on attention, negative affect and stress in healthy adults. Frontiers in Psychology, 8, 874.', '복식호흡 훈련 뒤 부정 정서와 코르티솔이 감소 (실험).'],
  scullin: ['Scullin, M. K., Krueger, M. L., Ballard, H. K., Pruett, N., & Bliwise, D. L. (2018). The effects of bedtime writing on difficulty falling asleep: A polysomnographic study comparing to-do lists and completed activity lists. Journal of Experimental Psychology: General, 147(1), 139–146.', '잠들기 전 5분 동안 할 일 목록을 쓴 집단이 끝낸 일을 쓴 집단보다 더 빨리 잠듦 (수면다원검사 실험).'],
  harvey: ['Harvey, A. G. (2002). A cognitive model of insomnia. Behaviour Research and Therapy, 40(8), 869–893.', '잠자리에서의 걱정·반추가 잠들기 어려움을 이어가게 만든다는 인지 모델.'],
  kjaervik: ['Kjærvik, S. L., & Bushman, B. J. (2024). A meta-analytic review of anger management activities that increase or decrease arousal: What fuels or douses rage? Clinical Psychology Review, 109, 102414.', '느린 호흡·이완처럼 각성을 낮추는 활동은 분노 감소와 관련. 달리기처럼 각성을 높이는 활동은 뚜렷한 효과가 없었음 (메타분석).'],
  bushman: ['Bushman, B. J. (2002). Does venting anger feed or extinguish the flame? Catharsis, rumination, distraction, anger, and aggressive responding. Personality and Social Psychology Bulletin, 28(6), 724–731.', '샌드백을 치며 화를 "푼" 집단이 주의를 돌린 집단보다 분노와 공격성이 더 컸음 (실험).'],
  lieberman: ['Lieberman, M. D., Eisenberger, N. I., Crockett, M. J., Tom, S. M., Pfeifer, J. H., & Way, B. M. (2007). Putting feelings into words: Affect labeling disrupts amygdala activity in response to affective stimuli. Psychological Science, 18(5), 421–428.', '감정을 단어로 이름 붙이자 정서 자극에 대한 편도체 반응이 줄어듦 (fMRI 실험).'],
  torre: ['Torre, J. B., & Lieberman, M. D. (2018). Putting feelings into words: Affect labeling as implicit emotion regulation. Emotion Review, 10(2), 116–124.', '감정 명명이 의도하지 않아도 감정 조절처럼 작동한다는 연구 종합 (리뷰).'],
  zhou: ['Zhou, X., Sedikides, C., Wildschut, T., & Gao, D.-G. (2008). Counteracting loneliness: On the restorative function of nostalgia. Psychological Science, 19(10), 1023–1029.', '외로움을 느끼는 상황에서 소중한 기억을 떠올리면 지각된 사회적 지지가 높아짐 (실험).'],
  cregg: ['Cregg, D. R., & Cheavens, J. S. (2021). Gratitude interventions: Effective self-help? A meta-analysis of the impact on symptoms of depression and anxiety. Journal of Happiness Studies, 22(1), 413–445.', '감사 활동의 우울·불안 감소 효과는 작음 — 이 행동 하나의 효과를 과장하지 않기 (메타분석).'],
  kumar: ['Kumar, A., & Epley, N. (2018). Undervaluing gratitude: Expressers misunderstand the consequences of showing appreciation. Psychological Science, 29(9), 1423–1435.', '감사 메시지를 보낸 사람은 받는 사람의 기쁨을 과소평가하고 어색함은 과대평가함 (실험).'],
  holt: ['Holt-Lunstad, J., Smith, T. B., & Layton, J. B. (2010). Social relationships and mortality risk: A meta-analytic review. PLoS Medicine, 7(7), e1000316.', '사회적 관계가 튼튼한 사람의 생존 가능성이 50% 높음 — 연결 자체의 중요성 (148개 연구 메타분석).'],
  verkruysse: ['Verkruysse, W., Svaasand, L. O., & Nelson, J. S. (2008). Remote plethysmographic imaging using ambient light. Optics Express, 16(26), 21434–21445.', '일반 카메라와 주변광만으로 얼굴 피부의 맥파 신호를 잡을 수 있고, 초록 채널 신호가 가장 강함.'],
  poh: ['Poh, M.-Z., McDuff, D. J., & Picard, R. W. (2010). Non-contact, automated cardiac pulse measurements using video imaging and blind source separation. Optics Express, 18(10), 10762–10774.', '웹캠 영상으로 잰 심박이 접촉식 센서 값과 높게 일치함.'],
  wang: ['Wang, W., den Brinker, A. C., Stuijk, S., & de Haan, G. (2017). Algorithmic principles of remote PPG. IEEE Transactions on Biomedical Engineering, 64(7), 1479–1491.', '이 앱이 쓰는 POS 알고리즘 — 조명 세기 변화에 강한 RGB 투영 방식.'],
  kim: ['Kim, H.-G., Cheon, E.-J., Bai, D.-S., Lee, Y. H., & Koo, B.-H. (2018). Stress and heart rate variability: A meta-analysis and review of the literature. Psychiatry Investigation, 15(3), 235–245.', '스트레스 상황에서 심박변이도(HRV) 같은 자율신경 지표가 달라짐 (메타분석).'],
  drake: ['Drake, C., Roehrs, T., Shambroom, J., & Roth, T. (2013). Caffeine effects on sleep taken 0, 3, or 6 hours before going to bed. Journal of Clinical Sleep Medicine, 9(11), 1195–1200.', '잠들기 6시간 전에 마신 카페인 400mg도 총수면을 1시간 넘게 줄임 (실험).'],
};
const refs = (...keys) => keys.map((k) => ({ cite: R[k][0], finding: R[k][1] }));

export const ROUTINES = [
  {
    id: 'toes', emotion: '무기력·우울', situation: '침대 위 · 눈 뜬 직후', slots: ['아침'], principle: '행동 활성화',
    title: '발가락 30초 꼼지락', minutes: 2,
    steps: ['누운 채로 발가락을 30초 꼼지락', '이불을 발로 차서 한 번에 개기', '커튼 열고 물 한 잔'],
    why: '마음이 움직이길 기다리기보다 몸을 아주 조금 먼저 움직여요.',
    level: 'C', note: '발가락 동작 자체를 검증한 연구는 없어요. "누운 상태 → 첫 움직임"을 가장 작은 단위로 쪼갠 설계이고, 근거는 행동 활성화 원리예요.',
    refs: refs('cuijpers', 'ekers', 'gollwitzer'),
  },
  {
    id: 'walk', emotion: '무기력·우울', situation: '방 안 · 오후', slots: ['낮', '저녁'], principle: '짧은 신체 활동',
    title: '현관 밖 3분 걷기', minutes: 5,
    steps: ['신발 신고 현관 밖으로 나가기', '햇빛 쪽으로 3분 걷기', '돌아와서 물 한 잔'],
    why: '짧게라도 걸으면 몸의 활력이 먼저 올라와요.',
    level: 'B', refs: refs('thayer', 'noetel', 'singh'),
  },
  {
    id: 'kind', emotion: '무기력·우울', situation: '탈락 소식 뒤 · 저녁', slots: ['저녁', '밤'], principle: '자기연민',
    title: '친구에게 하듯 나에게 한 문장', minutes: 3,
    steps: ['오늘 힘들었던 일을 한 줄로 적기', '같은 일을 겪은 친구에게 해줄 말 적기', '그 문장을 나에게 소리 내어 읽기'],
    why: '자책 대신 친구에게 하듯 말하면 다시 해볼 힘이 남아요.',
    level: 'B', refs: refs('breines', 'ferrari'),
  },
  {
    id: 'box', emotion: '불안·과부하', situation: '강의실·사무실 · 낮', slots: ['아침', '낮'], principle: '느린 호흡',
    title: '박스 호흡 4-4-4-4', minutes: 2,
    steps: ['4초 들이마시고 4초 멈추기', '4초 내쉬고 4초 멈추기', '이렇게 5번 반복'],
    why: '숨을 천천히 세면 몸의 긴장 신호가 잦아들어요.',
    level: 'B', refs: refs('balban', 'zaccaro', 'ma'),
  },
  {
    id: 'sigh', emotion: '불안·과부하', situation: '어디서나 · 숨이 얕을 때', slots: ['낮', '저녁', '밤'], principle: '긴 날숨',
    title: '두 번 들이쉬고 길게 내쉬기', minutes: 3,
    steps: ['코로 깊게 한 번, 짧게 한 번 더 들이쉬기', '입으로 천천히 길게 내쉬기', '1~5분 반복하기'],
    why: '날숨을 길게 하면 몸이 쉬는 쪽으로 기울어요.',
    level: 'B', refs: refs('balbanSigh', 'zaccaro'),
  },
  {
    id: 'todo', emotion: '불안·과부하', situation: '침대 위 · 잠들기 전', slots: ['밤'], principle: '걱정을 종이로 옮기기',
    title: '잠들기 전 5분 할 일 적기', minutes: 5,
    steps: ['내일 할 일을 떠오르는 대로 5분간 적기', '적은 종이는 침대 밖에 두기', '불 끄고 숨 길게 세 번'],
    why: '머릿속 할 일을 종이에 옮기면 잠자리에서 덜 붙잡혀요.',
    level: 'B', refs: refs('scullin', 'harvey'),
  },
  {
    id: 'step', emotion: '분노·울분', situation: '대중교통·알바 중', slots: ['낮', '저녁'], principle: '각성 낮추기 · 주의 전환',
    title: '한 걸음 물러나 날숨 길게', minutes: 3,
    steps: ['그 자리에서 몇 걸음 떨어지기', '날숨을 들숨보다 두 배 길게, 10번', '천천히 걸으며 보이는 것 5개 세기'],
    why: '화를 터뜨리기보다 몸의 각성을 먼저 낮춰요.',
    level: 'A', note: '원안이던 "빠른 음악에 맞춰 빠르게 걷기"는 각성을 높이는 활동이라, 2024년 메타분석 기준으로 분노에는 근거가 약해 바꿨어요.',
    refs: refs('kjaervik', 'bushman'),
  },
  {
    id: 'label', emotion: '분노·울분', situation: '어디서나 · 감정이 확 올라올 때', slots: ['아침', '낮', '저녁', '밤'], principle: '감정에 이름 붙이기',
    title: '감정 이름 한 단어로 적기', minutes: 1,
    steps: ['지금 감정을 한 단어로 적기 (예: 억울함)', '세기를 1~10으로 적기', '30초 뒤 세기를 다시 적기'],
    why: '감정에 이름을 붙이면 한 발짝 떨어져 볼 수 있어요.',
    level: 'B', refs: refs('lieberman', 'torre'),
  },
  {
    id: 'reread', emotion: '고독·소외감', situation: '방 안 · 늦은 밤', slots: ['밤', '저녁'], principle: '연결의 기억 떠올리기',
    title: '고마웠던 메시지 다시 읽기', minutes: 3,
    steps: ['메신저에서 고마웠던 대화 하나 찾기', '천천히 다시 읽기', '그때 기분을 한 줄로 적기'],
    why: '혼자인 밤에도 이어져 있던 순간을 다시 꺼내 봐요.',
    level: 'C', note: '메시지 다시 읽기 자체를 검증한 연구는 없어요. 근거는 "소중한 기억 떠올리기"가 사회적 지지감을 높인다는 실험이에요.',
    refs: refs('zhou', 'cregg'),
  },
  {
    id: 'hello', emotion: '고독·소외감', situation: '방 안 · 저녁', slots: ['낮', '저녁'], principle: '작은 연결 시도',
    title: '안부 한 줄 보내기', minutes: 2,
    steps: ['요즘 연락 못 한 사람 한 명 떠올리기', '"생각나서 연락했어" 한 줄 보내기', '답장은 기다리지 않기'],
    why: '보내는 쪽 생각보다 받는 쪽은 훨씬 반가워해요.',
    level: 'B', refs: refs('kumar', 'holt'),
  },
];

export const FEATURE_EVIDENCE = [
  { id: 'rppg', title: '웹캠 심박 측정 (rPPG)', use: '이마 피부색의 미세한 변화로 맥박을 추정하고, 평소 대비 변화만 참고로 보여줘요.', limit: '조명·움직임에 민감하고 의료용 측정이 아니에요.', refs: refs('verkruysse', 'poh', 'wang') },
  { id: 'hr', title: '심박과 긴장 상태', use: '평균 심박이 평소보다 10 이상 높으면 호흡 루틴을 권해요.', limit: '스트레스 지수는 심박변이도(HRV)가 필요해 아직 계산하지 않아요.', refs: refs('kim') },
  { id: 'chat', title: '대화형 감정 체크인', use: '설문 대신 대화로 감정에 이름을 붙이며 기록해요.', limit: '감정 분류는 Claude가 정해진 5개 선택지 안에서만 해요.', refs: refs('lieberman') },
  { id: 'caffeine', title: '카페인·수면 분석', use: '카페인을 마신 날과 그날 밤 수면의 시차 상관을 봐요.', limit: `기록이 14일 미만이면 분석하지 않고, 결과는 "경향"으로만 말해요.`, refs: refs('drake') },
];
