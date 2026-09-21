import { useState, useEffect } from "react";
import "./App.css";

const BASE_URL = "/api";
const USE_MOCK_DATA = false; // 목 데이터(Mock Data) 모드 활성화 (서버 연동 전이면 true)

// 시간을 24시간제로 바꿔주는 파싱 헬퍼 함수
const parseRecommendedTime = (timeStr) => {
  if (!timeStr) return { date: "", time: "" };

  let date = "";
  let time = "";

  if (timeStr.includes("저녁") || timeStr.includes("오후") || timeStr.includes("오전")) {
    const keywordIndex = timeStr.search(/저녁|오후|오전/);
    if (keywordIndex !== -1) {
      date = timeStr.substring(0, keywordIndex).trim();
      const rawTime = timeStr.substring(keywordIndex).trim();

      const match = rawTime.match(/\d+/);
      if (match) {
        let hour = parseInt(match[0], 10);
        if ((rawTime.includes("저녁") || rawTime.includes("오후")) && hour < 12) {
          hour += 12;
        } else if (rawTime.includes("오전") && hour === 12) {
          hour = 0;
        }
        time = `${hour.toString().padStart(2, "0")}:00`;
      } else {
        time = rawTime;
      }
    } else {
      date = timeStr;
      time = "";
    }
  } else {
    const lastSpaceIndex = timeStr.lastIndexOf(" ");
    if (lastSpaceIndex !== -1) {
      date = timeStr.substring(0, lastSpaceIndex).trim();
      time = timeStr.substring(lastSpaceIndex).trim();
    } else {
      date = timeStr;
      time = "";
    }
  }

  return { date, time };
};

function App() {
  // hero, form, answer, result
  const [currentPage, setCurrentPage] = useState("hero");

  const [meetingName, setMeetingName] = useState(
    "멋사 토이프로젝트 회의"
  );

  const [participantCount, setParticipantCount] = useState("6");

  const [meetingId, setMeetingId] = useState("");

  const [nickname, setNickname] = useState("");
  const [availableTime, setAvailableTime] = useState("");
  const [aiRecommend, setAiRecommend] = useState(null);
  const [showToast, setShowToast] = useState(false);

  // 대기 화면(waiting)을 위한 추가 상태
  const [maxParticipants, setMaxParticipants] = useState(0);
  const [responseCount, setResponseCount] = useState(0);

  const isReady =
    meetingName.trim() !== "" &&
    participantCount.trim() !== "";

  const isAnswerReady =
    nickname.trim() !== "" &&
    availableTime.trim() !== "";

  // 전체 모임 조회 api
  const fetchMeetingList = () => {
    if (USE_MOCK_DATA) {
      const mockMeetings = [
        {
          "meetingId": "aB1cD2eF",
          "title": "멋사 토이프로젝트 회의",
          "maxParticipants": 6,
          "createdAT": "2026-05-29T20:00:00"
        },
        {
          "meetingId": "xY9zW8vU",
          "title": "디자인 시스템 리팩토링",
          "maxParticipants": 4,
          "createdAT": "2026-05-30T10:15:00"
        }
      ];
      console.log("[목 데이터 모드] 모임 목록 조회 성공:", mockMeetings);
      return;
    }

    fetch(`${BASE_URL}/meetings`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("네트워크 응답에 문제가 있습니다.");
        }
        return response.json();
      })
      .then((data) => {
        console.log("데이터 가져오기 성공:", data);
      })
      .catch((error) => {
        console.error("데이터 가져오기 실패:", error);
        // 에러 시 처리할 로직 (예: 에러 안내 얼럿 등)
      });
  };

  // 모임 생성 api
  const createMeeting = (meetingName, participantCount) => {
    if (USE_MOCK_DATA) {
      console.log("[목 데이터 모드] 모임 생성 시작:", meetingName, participantCount);
      // 0.3초 지연 시간을 두어 실제 네트워크 통신 느낌 부여
      setTimeout(() => {
        const mockNewMeeting = {
          "meetingId": Math.random().toString(36).substr(2, 8).toUpperCase(),
          "title": meetingName || "목 토이 모임",
          "maxParticipants": Number(participantCount) || 6,
          "createdAT": new Date().toISOString()
        };
        console.log("[목 데이터 모드] 모임 생성 성공:", mockNewMeeting);

        // 생성 성공한 모임 아이디 저장.
        setMeetingId(mockNewMeeting.meetingId);
        setMaxParticipants(mockNewMeeting.maxParticipants);

        setCurrentPage("answer");

        // 입력창 비우기.
        // setMeetingName(""); // 방장이 본인 응답을 위해 모임명을 볼 수 있도록 유지 (폼에서만 지우고 헤더용은 남김)
        // setParticipantCount("");
      }, 300);
      return;
    }

    fetch(`${BASE_URL}/meetings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: meetingName,
        maxParticipants: Number(participantCount),
      }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("네트워크 응답에 문제가 있습니다.");
        }
        return response.json();
      })
      .then((data) => {
        console.log("데이터 생성 성공:", data);

        // 생성 성공한 모임 아이디 저장.
        setMeetingId(data.meetingId);
        setMaxParticipants(data.maxParticipants);

        setCurrentPage("answer");

        // 입력창 비우기.
        // setMeetingName("");
        // setParticipantCount("");
      })
      .catch((error) => {
        console.error("데이터 생성 실패:", error);
        alert("모임 생성에 실패했습니다. 다시 시도해 주세요.");
      });
  };

  // 모임의 응답 상태를 확인하여 대기 화면 또는 결과 화면으로 분기
  const fetchResponsesAndCheck = (targetMeetingId) => {
    if (USE_MOCK_DATA) {
      console.log("[목 데이터 모드] 응답 현황 확인 중...");
      setTimeout(() => {
        // 목데이터 모드에서는 항상 임의로 현재까지 1개 등록된 상태라고 가정하거나, 
        // 테스트 편의상 바로 result로 넘길지 결정해야 함.
        // 여기서는 수동 버튼 클릭 시 인원이 다 모인 것으로 가짜 처리 (테스트용)
        const mockResponses = Array.from({ length: maxParticipants || 6 }, (_, i) => ({ id: i }));
        setResponseCount(mockResponses.length);

        if (mockResponses.length >= (maxParticipants || 6)) {
          setCurrentPage("result");
        } else {
          setCurrentPage("waiting");
        }
      }, 500);
      return;
    }

    fetch(`${BASE_URL}/responses/meeting/${targetMeetingId}`)
      .then((response) => response.json())
      .then((data) => {
        const count = data.length;
        setResponseCount(count);

        if (maxParticipants > 0 && count >= maxParticipants) {
          // 인원이 모두 모임 -> 결과 화면
          setCurrentPage("result");
        } else {
          // 인원이 덜 모임 -> 대기 화면
          setCurrentPage("waiting");
        }
      })
      .catch((error) => {
        console.error("응답 현황 확인 실패:", error);
      });
  };

  // 참여자 일정 응답 제출 api
  const fetchParticipantResponse = (meetingId, nickname, availableTime) => {
    if (USE_MOCK_DATA) {
      console.log("[목 데이터 모드] 참여자 일정 응답 제출 시작:", meetingId, nickname, availableTime);
      setTimeout(() => {
        const mockResponse = {
          "responseId": Math.floor(Math.random() * 1000),
          "participantId": Math.floor(Math.random() * 1000) + 100,
          "meetingId": meetingId || "MOCK_MEETING_ID",
          "nickname": nickname || "목 유저",
          "rawText": availableTime,
          "submittedAt": new Date().toISOString()
        };
        console.log("[목 데이터 모드] 일정 응답 제출 성공:", mockResponse);

        setNickname("");
        setAvailableTime("");
        // 응답 제출 직후에는 일단 방금 제출한 내 것 포함해서 아직 다 안 찼다고 가정
        setResponseCount((prev) => prev + 1);
        
        // 제출 즉시 result로 가지 않고, 일단 waiting으로 간 뒤 상태 체크 함수를 호출
        setCurrentPage("waiting");
      }, 300);
      return;
    }

    fetch(`${BASE_URL}/responses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        meetingId: meetingId,
        nickname: nickname,
        rawText: availableTime,
      }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("네트워크 응답에 문제가 있습니다.");
        }
        return response.json();
      })
      .then((data) => {
        console.log("응답 제출 성공:", data);
        setNickname("");
        setAvailableTime("");
        
        // 제출 후 전체 현황을 다시 불러와서 화면 분기 결정
        fetchResponsesAndCheck(meetingId);
      })
      .catch((error) => {
        console.error("응답 제출 실패:", error);
        alert("참여자 일정 응답을 보내는데 실패했습니다. 다시 시도해 주세요.");
      });
  };

  const fetchAIRecommend = (meetingId) => {
    if (USE_MOCK_DATA) {
      console.log("[목 데이터 모드] AI 추천 분석 시작:", meetingId);
      setTimeout(() => {
        const mockData = {
          "totalResponses": 6,
          "recommendedTime": "6월 1일 (월) 저녁 7시",
          "alternativeTime": "6월 8일 (월) 저녁 7시",
          "reason": "가장 많은 인원(6명)이 참석 가능한 시간대입니다.",
          "noticeText": "모두가 모이기 좋은 월요일 저녁으로 확정될 것 같아요!",
          "isFallback": false,
          "optionStats": [
            {
              "option": "6월 1일 (월) 저녁 7시",
              "availableCount": 6
            },
            {
              "option": "6월 8일 (월) 저녁 7시",
              "availableCount": 5
            },
            {
              "option": "6월 2일 (화) 저녁 8시",
              "availableCount": 4
            },
            {
              "option": "6월 3일 (수) 저녁 6시",
              "availableCount": 3
            }
          ]
        };
        console.log("[목 데이터 모드] AI 추천 분석 성공:", mockData);
        setAiRecommend(mockData);
      }, 500);
      return;
    }

    fetch(`${BASE_URL}/meetings/${meetingId}/result`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("네트워크 응답에 문제가 있습니다.");
        }
        return response.json();
      })
      .then((data) => {
        console.log("AI 추천 데이터 로드 성공:", data);
        setAiRecommend(data);
      })
      .catch((error) => {
        console.error("AI 추천 데이터 로드 실패:", error);
        alert("AI 분석 결과를 가져오는데 실패했습니다.");
      });
  };

  // 모임 상세 정보 조회 api
  const fetchMeetingDetails = (targetMeetingId) => {
    if (USE_MOCK_DATA) {
      console.log("[목 데이터 모드] 모임 상세 조회 시작:", targetMeetingId);
      setMeetingName("멋사 토이프로젝트 회의 (초대됨)");
      return;
    }

    fetch(`${BASE_URL}/meetings/${targetMeetingId}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("모임 정보를 찾을 수 없습니다.");
        }
        return response.json();
      })
      .then((data) => {
        console.log("모임 상세 조회 성공:", data);
        if (data && data.title) {
          setMeetingName(data.title);
        }
        if (data && data.maxParticipants) {
          setMaxParticipants(data.maxParticipants);
        }
      })
      .catch((error) => {
        console.error("모임 상세 조회 실패:", error);
        alert("유효하지 않은 초대 링크이거나 모임 정보를 불러올 수 없습니다.");
        setCurrentPage("hero");
      });
  };

  // 페이지 최초 마운트 시 URL 쿼리 파라미터 감지 및 자동 초대장 이동
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("meetingId");
    if (id) {
      console.log("초대장 링크 감지됨. 모임 ID:", id);
      setMeetingId(id);
      setCurrentPage("answer");
      fetchMeetingDetails(id);
    }
  }, []);

  // 결과 화면(result)에 진입하면 자동으로 AI 추천 API를 호출합니다.
  useEffect(() => {
    if (currentPage === "result") {
      fetchAIRecommend(meetingId || "MOCK_MEETING_ID");
    }
  }, [currentPage, meetingId]);

  const parsedRecommend = aiRecommend ? parseRecommendedTime(aiRecommend.recommendedTime) : { date: "", time: "" };
  const parsedAlternative = aiRecommend ? parseRecommendedTime(aiRecommend.alternativeTime) : { date: "", time: "" };

  const totalCount = aiRecommend ? aiRecommend.totalResponses : 6;

  const recAvailableCount = aiRecommend && aiRecommend.optionStats
    ? (aiRecommend.optionStats.find(item => 
        item.option.replace(/\s+/g, "") === aiRecommend.recommendedTime.replace(/\s+/g, "")
      )?.availableCount || totalCount)
    : totalCount;

  const altAvailableCount = aiRecommend && aiRecommend.optionStats
    ? (aiRecommend.optionStats.find(item => 
        item.option.replace(/\s+/g, "") === aiRecommend.alternativeTime.replace(/\s+/g, "")
      )?.availableCount || 5)
    : 5;

  const recommendProgressPercent = (recAvailableCount / totalCount) * 100;
  const altProgressPercent = (altAvailableCount / totalCount) * 100;

  return (
    <main className="phone" aria-label="MeetPick 모임 생성">
      {/* HERO SCREEN */}
      <section
        className={`screen hero-screen ${currentPage === "hero" ? "active" : ""
          }`}
      >
        <img
          className="brand"
          src="/assets/logo.png"
          alt="MeetPick"
        />

        <div className="copy-column">
          <span className="chip">
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="m12 3 1.6 4.7L18 9.3l-4.4 1.6L12 16l-1.6-5.1L6 9.3l4.4-1.6L12 3Z"
                stroke="currentColor"
                strokeLinejoin="round"
              />
              <path
                d="m18.8 14 .8 2.4 2.4.8-2.4.8-.8 2.5-.8-2.5-2.5-.8 2.5-.8.8-2.4Z"
                stroke="currentColor"
                strokeLinejoin="round"
              />
            </svg>
            AI POWERED
          </span>

          <h1>
            모임 시간,
            <br />
            이제 AI가 대신 PICK
          </h1>

          <p className="subtitle">
            날짜 조율은 AI에게 맡기고,
            모임에만 집중하세요.
          </p>
        </div>

        <div className="hero-card">
          <img
            src="/assets/home-image.png"
            alt=""
          />
        </div>

        <button
          className="primary-button"
          type="button"
          onClick={() => setCurrentPage("form")}
        >
          모임 만들기
        </button>
      </section>

      {/* FORM SCREEN */}
      <section
        className={`screen form-screen ${currentPage === "form" ? "active" : ""
          }`}
      >
        <header className="topbar">
          <button
            className="back"
            type="button"
            aria-label="이전 화면"
            onClick={() => setCurrentPage("hero")}
          >
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="m15 5-7 7 7 7"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <div className="title">모임 생성</div>

          <div className="dots">
            <i className="active"></i>
            <i></i>
            <i></i>
          </div>
        </header>

        <span className="chip">
          <svg viewBox="0 0 24 24" fill="none">
            <path
              d="m12 3 1.6 4.7L18 9.3l-4.4 1.6L12 16l-1.6-5.1L6 9.3l4.4-1.6L12 3Z"
              stroke="currentColor"
              strokeLinejoin="round"
            />
            <path
              d="m18.8 14 .8 2.4 2.4.8-2.4.8-.8 2.5-.8-2.5-2.5-.8 2.5-.8.8-2.4Z"
              stroke="currentColor"
              strokeLinejoin="round"
            />
          </svg>
          STEP 1
        </span>

        <h1>어떤 모임인가요?</h1>

        <p className="subtitle">
          모임 이름과 참여 인원을 알려주세요.
        </p>

        <div className="field-list">
          <label className="field-card">
            <span className="field-label">
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="m4 16 1.1 3.9L9 19l9.6-9.6a2.6 2.6 0 0 0-3.7-3.7L5.3 15.3Z"
                  stroke="currentColor"
                  strokeLinejoin="round"
                />
                <path
                  d="M13.5 7.1 17 10.6"
                  stroke="currentColor"
                  strokeLinecap="round"
                />
              </svg>
              모임 이름
            </span>

            <input
              type="text"
              value={meetingName}
              onChange={(e) =>
                setMeetingName(e.target.value)
              }
              placeholder="모임 이름 입력"
            />
          </label>

          <label className="field-card">
            <span className="field-label">
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M8.5 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
                  stroke="currentColor"
                />
                <path
                  d="M2.8 20a5.7 5.7 0 0 1 11.4 0"
                  stroke="currentColor"
                  strokeLinecap="round"
                />
                <path
                  d="M16.5 11a2.8 2.8 0 1 0 0-5.6"
                  stroke="currentColor"
                  strokeLinecap="round"
                />
                <path
                  d="M17.1 14.8A5 5 0 0 1 21.2 20"
                  stroke="currentColor"
                  strokeLinecap="round"
                />
              </svg>
              참여 인원
            </span>

            <input
              type="text"
              value={participantCount}
              onChange={(e) =>
                setParticipantCount(e.target.value)
              }
              placeholder="참여 인원 입력"
            />
          </label>
        </div>

        <div className="form-actions">
          <button
            className={`primary-button ${isReady ? "ready" : ""
              }`}
            type="button"
            onClick={() => {
              if (isReady) {
                createMeeting(meetingName, participantCount);
              }
            }}
          >
            모임 페이지 생성
          </button>
        </div>
      </section>

      {/* ANSWER SCREEN */}
      <section
        className={`screen form-screen ${currentPage === "answer" ? "active" : ""
          }`}
      >
        <header className="topbar">
          <button
            className="back"
            type="button"
            aria-label="이전 화면"
            onClick={() => { setCurrentPage("form") }}
          >
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="m15 5-7 7 7 7"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <div className="title">기능 시간 응답하기</div>

          <div className="dots">
            <i></i>
            <i className="active"></i>
            <i></i>
          </div>
        </header>

        <span className="chip">
          <svg viewBox="0 0 24 24" fill="none">
            <path
              d="m12 3 1.6 4.7L18 9.3l-4.4 1.6L12 16l-1.6-5.1L6 9.3l4.4-1.6L12 3Z"
              stroke="currentColor"
              strokeLinejoin="round"
            />
            <path
              d="m18.8 14 .8 2.4 2.4.8-2.4.8-.8 2.5-.8-2.5-2.5-.8 2.5-.8.8-2.4Z"
              stroke="currentColor"
              strokeLinejoin="round"
            />
          </svg>
          STEP 2
        </span>

        <h1>가능한 시간을 편하게 적어주세요.</h1>

        <p className="subtitle">
          말하듯이 적으면 AI가 알아서 정리해줘요.
        </p>

        <div className="field-list">
          <label className="field-card">
            <span className="field-label">
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="m4 16 1.1 3.9L9 19l9.6-9.6a2.6 2.6 0 0 0-3.7-3.7L5.3 15.3Z"
                  stroke="currentColor"
                  strokeLinejoin="round"
                />
                <path
                  d="M13.5 7.1 17 10.6"
                  stroke="currentColor"
                  strokeLinecap="round"
                />
              </svg>
              닉네임
            </span>

            <input
              type="text"
              value={nickname}
              onChange={(e) =>
                setNickname(e.target.value)
              }
              placeholder="닉네임 입력"
            />
          </label>

          <label className="field-card">
            <span className="field-label">
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M8.5 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
                  stroke="currentColor"
                />
                <path
                  d="M2.8 20a5.7 5.7 0 0 1 11.4 0"
                  stroke="currentColor"
                  strokeLinecap="round"
                />
                <path
                  d="M16.5 11a2.8 2.8 0 1 0 0-5.6"
                  stroke="currentColor"
                  strokeLinecap="round"
                />
                <path
                  d="M17.1 14.8A5 5 0 0 1 21.2 20"
                  stroke="currentColor"
                  strokeLinecap="round"
                />
              </svg>
              가능한 시간
            </span>

            <textarea
              type="text"
              rows={4}
              value={availableTime}
              onChange={(e) =>
                setAvailableTime(e.target.value)
              }
              placeholder="화요일 17시 이후 가능하고 목요일은 어려워요. 너무 늦은 시간은 피하고 싶어요."
            />

            <span className="info-text">
              시간은 24시간대로 입력해주세요 (ex. 18시)
            </span>
          </label>
        </div>

        <div className="answer-actions">
          <button
            className={`primary-button ${isAnswerReady ? "ready" : ""
              }`}
            type="button"
            onClick={() => {
              if (isAnswerReady) {
                fetchParticipantResponse(meetingId, nickname, availableTime);
              }
            }}
          >
            응답 제출하기
          </button>

          <span
            className="share-button"
            onClick={() => {
              const url = `${window.location.origin}${window.location.pathname}?meetingId=${meetingId}`;
              
              const triggerToast = () => {
                setShowToast(true);
                setTimeout(() => {
                  setShowToast(false);
                }, 1500);
              };

              if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(url)
                  .then(triggerToast)
                  .catch((err) => {
                    console.error("복사 실패:", err);
                    triggerToast();
                  });
              } else {
                try {
                  const textArea = document.createElement("textarea");
                  textArea.value = url;
                  textArea.style.position = "fixed";
                  textArea.style.left = "-999999px";
                  document.body.appendChild(textArea);
                  textArea.focus();
                  textArea.select();
                  document.execCommand("copy");
                  textArea.remove();
                  triggerToast();
                } catch (e) {
                  console.error("Fallback 복사 실패:", e);
                  triggerToast();
                }
              }
            }}
          >
            페이지 공유하기
          </span>
        </div>
      </section>

      {/* WAITING SCREEN */}
      <section
        className={`screen form-screen ${currentPage === "waiting" ? "active" : ""
          }`}
      >
        <header className="topbar">
          <button
            className="back"
            type="button"
            aria-label="이전 화면"
            onClick={() => { setCurrentPage("answer") }}
          >
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="m15 5-7 7 7 7"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <img
            className="topbar-logo"
            src="/assets/logo.png"
            alt="MeetPick"
          />

          <div className="dots">
            <i></i>
            <i></i>
            <i className="active"></i>
          </div>
        </header>

        <div className="waiting-container">
          <div className="waiting-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/>
            </svg>
          </div>
          <h1>응답이 제출되었어요! 🎉</h1>
          <p className="waiting-subtitle">
            다른 팀원들의 응답을 기다리고 있습니다.
            <br />
            모두 제출하면 결과를 확인할 수 있어요.
          </p>

          <div className="waiting-card">
            <span className="waiting-count-label">현재 응답 현황</span>
            <div className="waiting-count-numbers">
              <span className="current">{responseCount}</span>
              <span className="total">/ {maxParticipants || 6}명</span>
            </div>
            
            <div className="waiting-progress-track">
              <div 
                className="waiting-progress-fill" 
                style={{ width: `${Math.min((responseCount / (maxParticipants || 6)) * 100, 100)}%` }}
              ></div>
            </div>
          </div>

          <div className="waiting-actions">
            <button 
              className="primary-button ready" 
              onClick={() => fetchResponsesAndCheck(meetingId)}
            >
              새로고침
            </button>
          </div>
        </div>
      </section>

      {/* RESULT SCREEN */}
      <section
        className={`screen form-screen ${currentPage === "result" ? "active" : ""
          }`}
      >
        <header className="topbar">
          <button
            className="back"
            type="button"
            aria-label="이전 화면"
            onClick={() => { setCurrentPage("answer") }}
          >
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="m15 5-7 7 7 7"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <img
            className="topbar-logo"
            src="/assets/logo.png"
            alt="MeetPick"
          />

          <div className="dots">
            <i></i>
            <i></i>
            <i className="active"></i>
          </div>
        </header>

        <span className="chip">
          <svg viewBox="0 0 24 24" fill="none">
            <path
              d="m12 3 1.6 4.7L18 9.3l-4.4 1.6L12 16l-1.6-5.1L6 9.3l4.4-1.6L12 3Z"
              stroke="currentColor"
              strokeLinejoin="round"
            />
            <path
              d="m18.8 14 .8 2.4 2.4.8-2.4.8-.8 2.5-.8-2.5-2.5-.8 2.5-.8.8-2.4Z"
              stroke="currentColor"
              strokeLinejoin="round"
            />
          </svg>
          AI 분석 완료
        </span>

        <div className="div-ai-result">
          <div style={{
            display: "flex",
            width: "35.998px",
            height: "35.998px",
            marginRight: "10px",
            padding: "0 8.999px",
            justifyContent: "center",
            alignItems: "center",
            flexShrink: 0,
            borderRadius: "20px",
            background: "#DEEFE9"
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none">
              <g clipPath="url(#clip0_25_596)">
                <path d="M11.9992 15.749V14.2491C11.9992 13.4535 11.6832 12.6905 11.1206 12.1279C10.558 11.5653 9.795 11.2493 8.99941 11.2493H4.49971C3.70411 11.2493 2.9411 11.5653 2.37853 12.1279C1.81596 12.6905 1.49991 13.4535 1.49991 14.2491V15.749" stroke="#10B981" strokeWidth="1.4999" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M6.74956 8.24936C8.4063 8.24936 9.74936 6.9063 9.74936 5.24956C9.74936 3.59281 8.4063 2.24976 6.74956 2.24976C5.09281 2.24976 3.74976 3.59281 3.74976 5.24956C3.74976 6.9063 5.09281 8.24936 6.74956 8.24936Z" stroke="#10B981" strokeWidth="1.4999" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M16.4989 15.7489V14.249C16.4984 13.5843 16.2772 12.9387 15.87 12.4133C15.4628 11.888 14.8926 11.5128 14.2491 11.3467" stroke="#10B981" strokeWidth="1.4999" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M11.9992 2.34741C12.6445 2.51263 13.2164 2.8879 13.6248 3.41407C14.0333 3.94025 14.2549 4.58739 14.2549 5.25347C14.2549 5.91955 14.0333 6.56669 13.6248 7.09286C13.2164 7.61903 12.6445 7.99431 11.9992 8.15952" stroke="#10B981" strokeWidth="1.4999" strokeLinecap="round" strokeLinejoin="round" />
              </g>
              <defs>
                <clipPath id="clip0_25_596">
                  <rect width="17.9988" height="17.9988" fill="white" />
                </clipPath>
              </defs>
            </svg>
          </div>

          {aiRecommend ? (
            <span>
              총 응답자 <span style={{ fontWeight: "700", color: "var(--green)" }}>{aiRecommend.totalResponses}명</span>의 가능 시간과 조건을 분석했어요.
            </span>
          ) : (
            <span>AI 분석 결과를 불러오는 중...</span>
          )}
        </div>

        {aiRecommend && (
          <>
            <div className="recommended-card">
              <div className="badge-row">
                <span className="badge">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "13px", height: "13px", marginRight: "5px", color: "white" }}>
                    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34M12 2a4 4 0 0 1 4 4v3H8V6a4 4 0 0 1 4-4Z" />
                  </svg>
                  추천 1순위
                </span>
              </div>

              <span className="recommend-date">
                {parsedRecommend.date}
              </span>

              <h2 className="recommend-time">
                {parsedRecommend.time}
              </h2>

              <p className="recommend-notice">
                🎉 {aiRecommend.noticeText}
              </p>

              <div className="bottom-bar-track">
                <div className="bottom-bar" style={{ width: `${recommendProgressPercent}%` }}></div>
              </div>
            </div>

            <div className="alternative1-card">
              <div className="alt-badge-row">
                <span className="alt-badge">대안</span>
                <span className="alt-count">
                  {altAvailableCount}명 가능
                </span>
              </div>

              <span className="alt-date">
                {parsedAlternative.date}
              </span>

              <h3 className="alt-time">
                {parsedAlternative.time}
              </h3>

              <div className="alt-progress-track">
                <div className="alt-progress-fill" style={{ width: `${altProgressPercent}%` }}></div>
              </div>
            </div>

            {aiRecommend.optionStats && aiRecommend.optionStats
              .filter(item => {
                const normalizedOption = item.option.replace(/\s+/g, "");
                const normalizedAlternative = aiRecommend.alternativeTime.replace(/\s+/g, "");
                const normalizedRecommended = aiRecommend.recommendedTime.replace(/\s+/g, "");
                return normalizedOption !== normalizedAlternative && normalizedOption !== normalizedRecommended;
              })
              .map((item, index) => {
                const parsedItem = parseRecommendedTime(item.option);
                const itemProgressPercent = (item.availableCount / totalCount) * 100;
                return (
                  <div className="candidate-card" key={index}>
                    <div className="cand-badge-row">
                      <span className="cand-badge">후보</span>
                      <span className="cand-count">
                        {item.availableCount}명 가능
                      </span>
                    </div>

                    <span className="cand-date">
                      {parsedItem.date}
                    </span>

                    <h3 className="cand-time">
                      {parsedItem.time}
                    </h3>

                    <div className="cand-progress-track">
                      <div className="cand-progress-fill" style={{ width: `${itemProgressPercent}%` }}></div>
                    </div>
                  </div>
                );
              })}

            <div className="ai-reason-card">
              <div className="reason-header">
                <div className="reason-icon-circle">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "16px", height: "16px", color: "white" }}>
                    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" fill="currentColor" />
                  </svg>
                </div>
                <h3 className="reason-title">AI 추천 이유</h3>
              </div>
              <p className="reason-text">{aiRecommend.reason}</p>
            </div>

            <button className="capture-button"
              onClick={() => {
                alert("결과 화면 캡쳐 기능은 준비 중입니다!");
              }}>
              <span className="viewfinder-corner tl"></span>
              <span className="viewfinder-corner tr"></span>
              <span className="viewfinder-corner bl"></span>
              <span className="viewfinder-corner br"></span>
              📸 결과 화면을 캡쳐해서 공유해보세요!
            </button>

            <button className="new-meeting-button"
              onClick={() => {
                setAiRecommend(null);
                setCurrentPage("form");
              }}>
              + 새 모임 만들기
            </button>
          </>
        )}

      </section>

      {showToast && (
        <div className="toast-overlay">
          <div className="toast-box">
            <svg className="toast-check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span className="toast-text">링크가 복사되었어요.</span>
          </div>
        </div>
      )}

    </main >
  );
}

export default App;