(() => {
  let utm = {};
  let fbp = "NOT_AVAILABLE";
  let fbc = "NOT_AVAILABLE";
  let userHasScrolled = false;
  let dynamicDeeplink = null;
  let anonId;
  const ctaTypeMap = {
    nav: "NAV_BAR",
    main: "MAIN_GET_STARTED",
    bottom: "BOTTOM_GET_STARTED",
    footer: "FOOTER_APP_STORE_ICON",
  };

  let trackingData = {
    page,
    lpType: url,
  };

  const validHosts = [
    "www.brightmoney.co",
    "brightmoney.co",
    "join.brightmoney.co",
  ];

  let apiBaseUrl = validHosts.includes(window.location.host)
    ? "https://gateway.brightmoney.co"
    : "https://gateway-dev.brightmoney.co";

  const eventToPixelMapping = {
    ["LANDING_PAGE_SEEN"]: {
      ["FB"]: { eventName: "LANDING_PAGE_SEEN" },
      ["SNAP"]: { eventName: "VIEW_CONTENT" },
      ["TIKTOK"]: { eventName: "ViewContent" },
      // ["IMPACT"]: { eventName: 26192 },
    },
    ["LANDING_PAGE_INSTALL_APP_CLICK"]: {
      ["FB"]: { eventName: "LANDING_PAGE_INSTALL_APP_CLICK" },
      ["SNAP"]: { eventName: "PURCHASE" },
      ["TIKTOK"]: { eventName: "ClickButton" },
      // ["IMPACT"]: { eventName: 26193 },
    },
  };
  function createUUID() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
      /[xy]/g,
      function (c) {
        var r = (Math.random() * 16) | 0,
          v = c == "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }
    );
  }
  function getCookie(name) {
    let cookie = document.cookie.split("; ").reduce((r, v) => {
      const parts = v.split("=");
      return parts[0] === name ? decodeURIComponent(parts[1]) : r;
    }, "NOT_AVAILABLE");

    return cookie;
  }
  function validateParam(param) {
    const invalid = [undefined, null, "", "NOT_AVAILABLE", "undefined"];
    if (!invalid.includes(param)) {
      return true;
    }
    return false;
  }
  function isEmailValid(email) {
    const re =
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
  }
  function callAPI({
    url,
    method,
    payload,
    completeFn = (xhr) => true,
    errorFn = (err) => false,
  }) {
    return new Promise((resolve, reject) => {
      $.ajax({
        url,
        method,
        headers: {
          "Content-Type": "application/json",
        },
        data: JSON.stringify(payload),
        complete: (xhr) => {
          completeFn(xhr);
          resolve(xhr);
        },
        error: (err) => {
          errorFn(err);
          reject(err);
        },
      });
    });
  }
  async function trackFbPixel(eventName) {
    try {
      if (eventToPixelMapping[eventName]["FB"]) {
        let anonymousId = await fetchAnonID();
        let fe_eventName =
          eventToPixelMapping[eventName]["FB"]["eventName"] || eventName;
        window.fbq &&
          fbq("trackCustom", fe_eventName, {
            utm_source: utm ? utm_source : "gtp",
            external_id: anonymousId,
            fbp: fbp,
            fbc: fbc,
          });
      }
    } catch (error) {
      sendSentryCall(`Page ${page} :: FB Pixel Track`, error);
    }
  }
  function trackSnapPixel(eventName) {
    try {
      if (eventToPixelMapping[eventName]["SNAP"]) {
        let fe_eventName =
          eventToPixelMapping[eventName]["SNAP"]["eventName"] || eventName;
        window.snaptr && snaptr("track", fe_eventName);
      }
    } catch (error) {
      sendSentryCall(`Page ${page} :: Snap Pixel Track`, error);
    }
  }
  function trackTiktokPixel(eventName) {
    try {
      if (eventToPixelMapping[eventName]["TIKTOK"]) {
        let fe_eventName =
          eventToPixelMapping[eventName]["TIKTOK"]["eventName"] || eventName;
        window.ttq && window.ttq.track(fe_eventName);
      }
    } catch (error) {
      sendSentryCall(`Page ${page} :: TikTok Pixel Track`, error);
    }
  }
  function trackPixel(eventName) {
    try {
      if (eventToPixelMapping[eventName]) {
        trackFbPixel(eventName);
        trackSnapPixel(eventName);
        // trackImpactPixel(eventName);
        trackTiktokPixel(eventName);
      }
    } catch (error) {
      sendSentryCall(`Page ${page} :: Track Pixel`, error);
    }
  }
  function sendSentryCall(statement, error) {
    window.Sentry &&
      Sentry.captureException(Error(`${statement} Error: ${error}`));
  }
  function sendAnalyticsCall(name, payload) {
    try {
      window.analytics &&
        analytics.track(name, {
          ...payload,
          ...(trackingData || {}),
          ...(utm || {}),
          fbp,
          fbc,
        });
      if (validHosts.includes(window.location.host)) {
        trackPixel(name);
      }
    } catch (error) {
      sendSentryCall(`${name} event failed.`, error);
    }
  }
  function populateUTMData() {
    window.location.search
      .substr(1)
      .split("&")
      .forEach(function (item) {
        utm[item.split("=")[0]] = item.split("=")[1];
      });

    // Add custom UTM params for the homepage
    if (page === "homepage") {
      if (!utm.utm_source) utm.utm_source = "gtp";
      if (!utm.utm_medium) utm.utm_medium = "org";
    }
  }
  const urlToOpen = async (urlConditions) => {
    if (urlConditions && urlConditions.downloadAppRedir)
      return urlConditions.url;

    if (url === "WEB_URL") return await getWebUrl(urlConditions);

    if (url === "SINGULAR") return dynamicDeeplink;

    return url || "https://app.brightmoney.co";
  };
  async function onButtonClick(urlConditions) {
    let open = await urlToOpen(urlConditions);

    // Button Click Event
    sendAnalyticsCall("LANDING_PAGE_INSTALL_APP_CLICK", {
      appUrl: open,
      page: page,
      ...(utm || {}),
    });

    // window.alert(open);
    setTimeout(() => {
      window.open(open || "https://app.brightmoney.co", "_self");
    }, 500);
  }
  const getWebUrl = async (urlConditions) => {
    let url = `https://dev-app.brightmoney.co/?ft=4&wsv=${wsv ? wsv : 3}`;
    if (validHosts.includes(window.location.host)) {
      url = `http://app.brightmoney.co/?ft=4&wsv=${wsv ? wsv : 3}`;
    }

    // LP flow handling
    if (LP_FLOW) {
      url += `&lp_flow=${LP_FLOW}`;

      switch (LP_FLOW) {
        case "1": // Regular Flow
          // No extra params...
          break;
        case "2": // Skip email flow
          url += `&skip_email=${skip_email ? "T" : "F"}`;
          break;
        case "3": // Email on LP flow
          if (urlConditions && urlConditions.email !== "") {
            url += `&returning_user=${
              urlConditions.returning_user ? "T" : "F"
            }&email=${urlConditions.email}&skip_email=T`;
          } else {
            url += `&skip_email=${skip_email ? "T" : "F"}`;
          }
        default: // Do nothing...
      }
    } else {
      if (skip_email) url += "&lp_flow=2";
      else "&lp_flow=1";
    }

    if (urlConditions && urlConditions.tf_goal)
      url += `&tf_goal=${urlConditions.tf_goal.split(" ").join("_")}`;

    // Common params for all flows
    if (validateParam(fbp)) url = url.concat(`&fbp=${fbp}`);
    if (validateParam(fbc)) url = url.concat(`&fbc=${fbc}`);

    if (validateParam("gtp")) url = url.concat(`&utm_source=${"gtp"}`);

    Object.keys(utm).forEach((item) => {
      if (validateParam(utm[item])) {
        url += `&${item}=${utm[item]}`;
      }
    });

    if (validateParam(page)) url = url.concat(`&page=${page}`);

    try {
      const anonymousID = await fetchAnonID();
      if (validateParam(anonymousID))
        url = url.concat(`&anonId=${anonymousID}`);
    } catch (error) {
      sendSentryCall(`Landing Page get anonymous id failed`, error);
    }

    return url;
  };
  async function fetchAnonID() {
    try {
      let id = await analytics.user().anonymousId();
      return id;
    } catch (error) {
      sendSentryCall(`Landing Page ${page} Anon Id`, error);
      return "NOT_AVAILABLE";
    }
  }
  async function sendLogCall(payload) {
    const anonymousID = await fetchAnonID();
    let resp;

    if (page === "homepage") payload.referrer = document.referrer;

    try {
      let lpFlow;
      if (LP_FLOW) lpFlow = LP_FLOW;
      else if (skip_email) lpFlow = "2";
      else lpFlow = "1";

      const logCallData = {
        anonId: anonymousID,
        event_name: "LP_CTA_CLICK",
        event_data: {
          ...{
            page,
            LP_FLOW: LP_FLOW || "1",
            fbp,
            fbc,
            appUrl: url === "WEB_URL" ? "WEBFLOW" : "DEEPLINK",
          },
          ...(utm || {}),
          ...(payload || {}),
        },
      };

      let logCallURL =
        "https://gateway-dev.brightmoney.co/api/v1/eventms/lp/clicks/add/";

      if (validHosts.includes(window.location.host)) {
        logCallURL =
          "https://gateway.brightmoney.co/api/v1/eventms/lp/clicks/add/";
      }

      // LP log evnts call
      resp = await callAPI({
        url: logCallURL,
        method: "POST",
        payload: logCallData,
        completeFn: (xhr) => {
          if (xhr.status === 200) console.log("Log call sent successfully!");
          sendAnalyticsCall("LP_CTA_CLICK_FE_CALL_COMPLETE", { lp_id: page });
        },
        error: (err) => {
          console.error(err);
          sendSentryCall(`LP page ${page} LP_CTA_CLICK API call failed.`, err);
        },
      });
    } catch (error) {
      sendSentryCall("LP_CTA_CLICK call failed.", error);
    }

    return resp;
  }
  function sendPageSeenCall() {
    fbp = getCookie("_fbp");
    fbc = getCookie("_fbc");

    // Page Seen Event
    sendAnalyticsCall(`LANDING_PAGE_${page}_SEEN`, {
      page: page,
      ...(utm || {}),
      fbp,
      fbc,
    });

    // Additional Seen event for easy analytics
    sendAnalyticsCall(`LANDING_PAGE_SEEN`, {
      page: page,
      ...(utm || {}),
      fbp,
      fbc,
    });
  }
  const getDynamicDeeplink = async () => {
    const body = {
      meta: {},
      data: {
        utm: {
          utm_source: utm ? utm_source : "",
          utm_medium: utm ? utm_medium : "",
          utm_campaign: utm ? utm_campaign : "",
          utm_adset: utm ? utm_adset : "",
          utm_ad: utm ? utm_ad : "",
          utm_keyword: utm ? utm_keyword : "",
          utm_content: utm ? utm_content : "",
        },
        lp_page: page || "",
      },
    };

    const resp = await callAPI({
      url: `${apiBaseUrl}/api/v1/users/get_deep_link/`,
      // url: `https://gateway-dev.brightmoney.co/api/v1/users/get_deep_link/`, // For testing purpose
      method: "POST",
      payload: body,
      completeFn: (xhr) => {
        if (xhr.status === 200) {
          sendAnalyticsCall("LANDING_PAGE_DYNAMIC_DEEPLINK_FETCHED", {
            page: page,
            ...(utm || {}),
            fbp,
            fbc,
            deeplink: xhr.responseJSON.data.deeplink,
          });
        }
      },
      errorFn: (xhr) => {
        console.log(xhr);
      },
    });

    dynamicDeeplink = resp.data.deeplink;
  };
  function setLoadingState(element) {
    const isAnchorNode = element.nodeName === "A";
    const isInputNode = element.nodeName === "INPUT";
    let ogValue;

    // Fetch & save the original value
    if (isAnchorNode) ogValue = $(element).text();
    else if (isInputNode) ogValue = $(element).val();

    // Set original text back to the CTA after 3 secs
    setTimeout(() => {
      if (isAnchorNode) $(element).text(ogValue);
      else if (isInputNode) $(element).val(ogValue);
    }, 3000);

    // Set "Loading..." text
    if (isAnchorNode) $(element).text("Loading...");
    else if (isInputNode) $(element).val("Loading...");
  }
  function getWaitlistCallURL() {
    switch (window.location.host) {
      case "join.brightmoney.co/":
      case "www.brightmoney.co":
      case "brightmoney.co":
        waitlistURL =
          "https://gateway.brightmoney.co/api/v1/users/waitlist/add/";
        break;
      default:
        waitlistURL =
          "https://gateway-dev.brightmoney.co/api/v1/users/waitlist/add/";
    }
    return waitlistURL;
  }
  function registerDOMEvents() {
    // Clear the error msg if input is emptied
    $(".email-input").keyup((event) => {
      if ($(event.target).val() === "")
        $(`#${$(event.target).data("err-field")}`).hide();
    });

    // Email on LP screen click
    $(".email-get-started").click(async (event) => {
      anonID = await fetchAnonID();
      event.preventDefault();
      event.stopPropagation();
      let logCallPayload = {
        referrer: document.referrer,
      };
      let ctaPosition = "";

      sendAnalyticsCall("LP_EMAIL_ENTERED", {
        lp_id: page,
        referrer: document.referrer,
      });

      // Determine ctaPosition for homepage
      if (page === "homepage") {
        ctaPosition = $(event.target).data("cta-pos");
        logCallPayload.cta_position = ctaPosition;
      }

      if (
        !$(event.target).data("input-field") ||
        $(event.target).data("input-field") === "NA"
      ) {
        // CTA_CLICK click event call (only on homepage)
        if (page === "homepage") {
          // Define payload for CTA_CLICK
          const ctaClickPayload = {
            type: ctaTypeMap[ctaPosition],
            email_entered: "False",
            referrer: document.referrer,
          };

          const isLogCallComplete = await sendLogCall({
            ...logCallPayload,
            ...ctaClickPayload,
          });
          sendAnalyticsCall("CTA_CLICK", ctaClickPayload);
        } else {
          const isLogCallComplete = await sendLogCall(logCallPayload);
        }

        setLoadingState(event.target);
        onButtonClick();
        return true;
      }

      const emailValue = $(`#${$(event.target).data("input-field")}`).val();
      logCallPayload.email = emailValue;

      // CTA_CLICK click event call + modify logCall payload (only on homepage)
      if (page === "homepage") {
        // Define payload for CTA_CLICK
        const ctaClickPayload = {
          type: ctaTypeMap[$(event.target).data("cta-pos")],
          email_entered: "False",
        };

        const isLogCallComplete = await sendLogCall(ctaClickPayload);
        console.log(isLogCallComplete);
        sendAnalyticsCall("CTA_CLICK", ctaClickPayload);
      } else {
        const isLogCallComplete = await sendLogCall(logCallPayload);
        console.log(isLogCallComplete);
      }

      // Validate email, stop execution if false
      if (emailValue !== "" && !isEmailValid(emailValue)) {
        // Show error message
        $(`#${$(event.target).data("err-field")}`).show();

        event.preventDefault();
        event.stopPropagation();
        return false;
      } else {
        // Hide error message
        $(`#${$(event.target).data("err-field")}`).hide();
        setLoadingState(event.target);
      }

      const anonymousID = await fetchAnonID();

      if (emailValue !== "") {
        const payload = {
          meta: {
            bm_request_id: createUUID(),
            bm_session_id: createUUID(),
            app_version: "1.0-v0",
            client_source: "web",
            client_source_meta: "web_v2",
          },
          data: {
            email: emailValue,
            email_collected_on: "LP",
            lp_id: page,
            utm: utm || {},
            fb_details: {
              fbp,
              fbc,
            },
            anonId: anonymousID,
            lp_type: url === "WEB_URL" ? "WEB_APP" : "APP",
            referrer: document.referrer,
          },
        };

        if (page === "homepage") {
          payload.data.referrer = document.referrer;
          payload.data.cta_position = ctaPosition;
        }

        // User waitlist call
        await callAPI({
          url: getWaitlistCallURL(),
          method: "POST",
          payload,
          completeFn: async (xhr) => {
            let urlConditions;

            if (xhr.status === 200) {
              urlConditions = {
                returning_user: false,
                email: emailValue,
              };

              sendAnalyticsCall("INITIATING_LP_EMAIL_NEW_USER_FLOW", {
                appUrl: await getWebUrl(urlConditions),
                lp_id: page,
                ...(utm || {}),
                fbp,
                fbc,
                referrer: document.referrer,
              });
            } else if (xhr.status === 409) {
              urlConditions = {
                returning_user: true,
                email: emailValue,
              };
              sendAnalyticsCall("INITIATING_LP_EMAIL_RETURNING_USER_FLOW", {
                appUrl: await getWebUrl(urlConditions),
                lp_id: page,
                ...(utm || {}),
                fbp,
                fbc,
                referrer: document.referrer,
              });
            }
            onButtonClick(urlConditions);
          },
          errorFn: (err) => {
            console.error(err);
            sendSentryCall(`LP page ${page} waitlist API error ${err}`);
          },
        });
      } else {
        sendAnalyticsCall("INITIATING_LP_EMAIL_NOT_ENTERED_FLOW", {
          appUrl: await getWebUrl(),
          lp_id: page,
          ...(utm || {}),
          fbp,
          fbc,
          referrer: document.referrer,
        });
        onButtonClick();
      }
    });

    // Normal get started button clicks
    $(".button-event").click(async (event) => {
      try {
        const isLogCallComplete = await sendLogCall({});
        console.log(isLogCallComplete);
      } catch (error) {}
      onButtonClick();
    });

    // Engagement LP option selection handler
    $(".fin-goal-option").click(() => {
      const optionValue = $(event.target).text();

      $("#fin-goal").text(optionValue);
    });

    // Engagement LP Submit button handler
    $("#get-prnlized-plan-btn").click(async (event) => {
      anonID = await fetchAnonID();
      event.preventDefault();
      event.stopPropagation();
      setLoadingState(event.target);

      const isLogCallComplete = await sendLogCall({});
      console.log(isLogCallComplete);

      let tf_goal = $(`#${$(event.target).data("input-field")}`).text();
      if (tf_goal === "Select any one") tf_goal = "NA";

      onButtonClick({ tf_goal });
    });

    // Download App CTAs redirection calls
    $(".download-app-cta").click(async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const ctaPosition = $(event.target).data("cta-pos");

      const ctaClickPayload = {
        type: ctaTypeMap[ctaPosition],
        email_entered: "False",
      };

      const isLogCallComplete = await sendLogCall(ctaClickPayload);
      console.log(isLogCallComplete);
      sendAnalyticsCall("CTA_CLICK", ctaClickPayload);

      onButtonClick({
        downloadAppRedir: true,
        url: $(event.currentTarget).attr("href"),
      });
    });

    // CTA click tracking (implemented from Brand design)
    $(".tracked-cta").click((event) => {
      if (
        !(
          $(event.currentTarget).hasClass("waitlist-cta") ||
          $(event.currentTarget).hasClass("no-redirection")
        )
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
      let utmContent;

      if ($(event.currentTarget).data("utm_content") === "redir-slug")
        utmContent = $(event.currentTarget).attr("href");
      else utmContent = $(event.currentTarget).data("utm_content");

      const payload = {
        utm_source: utm ? utm_source : "gtp",
        utm_medium: utm ? utm_medium : "org",
        utm_campaign: utm ? utm_campaign : "site",
        utm_content: utmContent,
        utm_page: page,
      };

      sendAnalyticsCall("WEBSITE_CTA_CLICK", payload);

      if (
        !(
          $(event.currentTarget).hasClass("waitlist-cta") ||
          $(event.currentTarget).hasClass("no-redirection") ||
          $(event.currentTarget).hasClass("email-get-started")
        )
      ) {
        try {
          if ($(event.currentTarget).attr("href") !== "#")
            window.open($(event.currentTarget).attr("href"), "_self");
        } catch {
          window.open("https://bm.sng.link/Du8kf/lte6?_smtype=3", "_self");
        }
      }
    });

    // School of Money Science page "Join wailist"
    $(".waitlist-cta").click(async (event) => {
      console.log("CALLING_API");
      event.preventDefault();
      event.stopPropagation();
      const emailValue = $(`#${$(event.target).data("input-field")}`).val();

      if (!isEmailValid(emailValue)) {
        $(`#${$(event.target).data("err-field")}`).fadeIn();
        return false;
      } else {
        $(`#${$(event.target).data("err-field")}`).fadeOut();
      }

      let anonId = await fetchAnonID();
      let source = $(event.target).data("waitlist-source");

      const waitlistPayload = {
        meta: {
          bm_request_id: createUUID(),
          bm_session_id: createUUID(),
          app_version: "1.0-v0",
          client_source: "web",
          client_source_meta: "web_v2",
        },
        data: {
          email: emailValue,
          email_collected_on: window.location.href,
          source,
          lp_id: page,
          utm: utm || {},
          fb_details: {
            fbp,
            fbc,
          },
          anonId,
          referrer: document.referrer,
        },
      };

      // User waitlist call
      await callAPI({
        url: getWaitlistCallURL(),
        method: "POST",
        payload: waitlistPayload,
        completeFn: async (xhr) => {
          if (xhr.status === 200) {
            $("#success-modal").fadeIn();
            $(`#${$(event.target).data("input-field")}`).val("");
          }
        },
      });
    });

    // Handle modal close
    $("#modal-close").click(() => {
      $("#success-modal").fadeOut();
    });
  }
  async function init() {
    populateUTMData();
    registerDOMEvents();

    if (url === "SINGULAR") {
      getDynamicDeeplink();
    }

    // Scroll to top
    window.scrollTo({
      top: 0,
    });
  }
  $(document).ready(init);

  document.onreadystatechange = async () => {
    if (document.readyState === "complete") {
      // Enable the email collection CTAs when page loading is complete
      $(".email-get-started").removeClass("disabled");
      $(".button-event").css({ "pointer-events": "unset", opacity: "unset" });

      sendPageSeenCall();

      if (url === "REDIRECT") {
        let open = dynamicDeeplink;
        let retryCount = 0;

        const setDynamicDeeplink = setInterval(async () => {
          open = dynamicDeeplink;
          console.log("FETCH ", open);
          retryCount += 1;

          if (open) {
            clearInterval(setDynamicDeeplink);
            window.location.href =
              open || "https://app.brightmoney.co/?deeplink_fetched=false";
          }

          if (retryCount === 5) {
            getDynamicDeeplink();
          }

          if (retryCount === 15) {
            clearInterval(setDynamicDeeplink);
            window.location.href =
              open || "https://app.brightmoney.co/?deeplink_fetched=false";
          }
        }, 500);
      }
    }
  };
  window.onscroll = (event) => {
    if (!userHasScrolled && window.scrollY > window.innerHeight) {
      userHasScrolled = true;
      sendAnalyticsCall("LANDING_PAGE_USER_SCROLLED", {
        page: page,
        ...(utm || {}),
        fbp,
        fbc,
      });
    }
  };
})();
