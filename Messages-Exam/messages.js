function startApp() {
    showHideMenuLinks();
    showCorrectHomeView();

    // Bind the navigation menu links
    $("#linkMenuAppHome").click(showAppHomeView);
    $("#linkMenuLogin").click(showLoginView);
    $("#linkMenuRegister").click(showRegisterView);

    $("#linkMenuUserHome").click(showUserHomeView);
    $("#linkMenuMyMessages").click(showMyMessagesView);
    $("#linkMenuArchiveSent").click(showArchiveSentView);
    $("#linkMenuSendMessage").click(showSendMessageView);
    $("#linkMenuLogout").click(logoutUser);

    // Bind user home links
    $("#linkUserHomeMyMessages").click(showMyMessagesView);
    $("#linkUserHomeSendMessage").click(showSendMessageView);
    $("#linkUserHomeArchiveSent").click(showArchiveSentView);

    // Bind the form submit buttons
    $("#formLogin").submit(loginUser);
    $("#formRegister").submit(registerUser);
    $("#formSendMessage").submit(sendMessage);
    $("form").submit(function(event) { event.preventDefault() });

    // Bind the info / error boxes
    $("#infoBox, #errorBox").click(function() {
        $(this).fadeOut();
    });

    // Attach AJAX "loading" event listener
    $(document).on({
        ajaxStart: function() { $("#loadingBox").show() },
        ajaxStop: function() { $("#loadingBox").hide() }
    });

    // Attach a global AJAX error handler
    $(document).ajaxError(handleAjaxError);

    const kinveyBaseUrl = "https://baas.kinvey.com/";
    const kinveyAppKey = "kid_BkLK4Mozg";
    const kinveyAppSecret = "52b8d23f0b7a447f91b002ff26342a75";
    const kinveyAppAuthHeaders = {
        'Authorization': "Basic " + btoa(kinveyAppKey + ":" + kinveyAppSecret),
    };

    function getKinveyUserAuthHeaders() {
        return {
            'Authorization': "Kinvey " + sessionStorage.getItem('authtoken'),
        };
    }

    function showView(viewName) {
        // Hide all views and show the selected view only
        $('main > section').hide();
        $('#' + viewName).show();
    }

    function showHideMenuLinks() {
        if (sessionStorage.getItem('authtoken') == null) {
            // No logged in user
            $('#menu .anonymous').show();
            $('#menu .useronly').hide();
            $('#spanMenuLoggedInUser').text("");
        } else {
            // We have logged in user
            $('#menu .anonymous').hide();
            $('#menu .useronly').show();
            $('#spanMenuLoggedInUser').text("Welcome, " +
                sessionStorage.getItem('username') + "!");
        }
    }

    function showInfo(message) {
        $('#infoBox').text(message);
        $('#infoBox').show();
        setTimeout(function() {
            $('#infoBox').fadeOut();
        }, 3000);
    }

    function showError(errorMsg) {
        $('#errorBox').text("Error: " + errorMsg);
        $('#errorBox').show();
    }

    function handleAjaxError(event, response) {
        let errorMsg = JSON.stringify(response);
        if (response.readyState === 0)
            errorMsg = "Cannot connect due to network error.";
        if (response.responseJSON && response.responseJSON.description)
            errorMsg = response.responseJSON.description;
        showError(errorMsg);
    }

    function showCorrectHomeView() {
        if (sessionStorage.getItem('username'))
            showUserHomeView();
        else
            showAppHomeView();
    }

    function showAppHomeView() {
        showView('viewAppHome');
    }

    function showLoginView() {
        showView('viewLogin');
        $('#formLogin').trigger('reset');
    }

    function loginUser() {
        let userData = {
            username: $('#formLogin input[name=username]').val(),
            password: $('#formLogin input[name=passwd]').val()
        };
        $.ajax({
            method: "POST",
            url: kinveyBaseUrl + "user/" + kinveyAppKey + "/login",
            headers: kinveyAppAuthHeaders,
            data: userData,
            success: loginSuccessful
        });

        function loginSuccessful(userInfo) {
            saveAuthInSession(userInfo);
            showHideMenuLinks();
            showUserHomeView();
            showInfo('Login successful.');
        }
    }

    function saveAuthInSession(userInfo) {
        sessionStorage.setItem('username', userInfo.username);
        sessionStorage.setItem('name', userInfo.name);
        sessionStorage.setItem('userId', userInfo._id);
        sessionStorage.setItem('authtoken', userInfo._kmd.authtoken);
    }

    function showRegisterView() {
        $('#formRegister').trigger('reset');
        showView('viewRegister');
    }

    function registerUser() {
        let userData = {
            username: $('#formRegister input[name=username]').val(),
            password: $('#formRegister input[name=passwd]').val(),
            name: $('#formRegister input[name=name]').val()
        };
        $.ajax({
            method: "POST",
            url: kinveyBaseUrl + "user/" + kinveyAppKey + "/",
            headers: kinveyAppAuthHeaders,
            data: userData,
            success: registerSuccessful
        });

        function registerSuccessful(userInfo) {
            saveAuthInSession(userInfo);
            showHideMenuLinks();
            showUserHomeView();
            showInfo('User registration successful.');
        }
    }

    function showUserHomeView() {
        $('#viewUserHome h1').text('Welcome, ' +
            sessionStorage.getItem('username') + '!');
        showView('viewUserHome');
    }

    function showMyMessagesView() {
        $('#viewMyMessages .messages').empty();
        showView('viewMyMessages');

        let recipient = sessionStorage.getItem('username');
        $.ajax({
            method: "GET",
            url: kinveyBaseUrl + "appdata/" + kinveyAppKey +
                `/messages?query={"recipient_username":"${recipient}"}`,
            headers: getKinveyUserAuthHeaders(),
            success: renderMyMessages
        });

        function renderMyMessages(messages) {
            let table = $("<table><thead><tr><th>From</th><th>Message</th><th>Date Received</th></tr></thead></table>");
            let tbody = $("<tbody>");
            table.append(tbody);
            for (let msg of messages) {
                let tr = $("<tr>")
                    .append($("<td>").text(formatSender(
                        msg.sender_username, msg.sender_name)))
                    .append($("<td>").text(msg.text))
                    .append($("<td>").text(formatDate(msg._kmd.lmt)));
                tbody.append(tr);
            }
            $('#viewMyMessages .messages').append(table);
        }
    }

    function showArchiveSentView() {
        $('#viewArchiveSent .messages').empty();
        showView('viewArchiveSent');

        let sender = sessionStorage.getItem('username');
        $.ajax({
            method: "GET",
            url: kinveyBaseUrl + "appdata/" + kinveyAppKey +
            `/messages?query={"sender_username":"${sender}"}`,
            headers: getKinveyUserAuthHeaders(),
            success: renderSentMessages
        });

        function renderSentMessages(messages) {
            let table = $("<table><thead><tr><th>To</th><th>Message</th><th>Date Sent</th><th>Actions</th></tr></thead></table>");
            let tbody = $("<tbody>");
            table.append(tbody);
            for (let msg of messages) {
                let delButton = $("<button>Delete</button>")
                    .click(deleteMessage.bind(null, msg._id));
                let tr = $("<tr>")
                    .append($("<td>").text(msg.recipient_username))
                    .append($("<td>").text(msg.text))
                    .append($("<td>").text(formatDate(msg._kmd.lmt)))
                    .append($("<td>").append(delButton));
                tbody.append(tr);
            }
            $('#viewArchiveSent .messages').append(table);
        }
    }

    function deleteMessage(msgId) {
        $.ajax({
            method: "DELETE",
            url: kinveyBaseUrl + "appdata/" + kinveyAppKey + "/messages/" + msgId,
            headers: getKinveyUserAuthHeaders(),
            success: messageDeleted
        });

        function messageDeleted() {
            showInfo("Message deleted.");
            showArchiveSentView();
        }
    }

    function formatDate(dateISO8601) {
        let date = new Date(dateISO8601);
        if (Number.isNaN(date.getDate()))
            return '';
        return date.getDate() + '.' + padZeros(date.getMonth() + 1) +
            "." + date.getFullYear() + ' ' + date.getHours() + ':' +
            padZeros(date.getMinutes()) + ':' + padZeros(date.getSeconds());

        function padZeros(num) {
            return ('0' + num).slice(-2);
        }
    }

    function formatSender(name, username) {
        if (!name)
            return username;
        else
            if (username)
                return name + ' (' + username + ')';
            else
                return name;
    }

    function showSendMessageView() {
        $('#formSendMessage').trigger('reset');
        $('#formSendMessage select').empty();

        $.ajax({
            method: "GET",
            url: kinveyBaseUrl + "user/" + kinveyAppKey,
            headers: getKinveyUserAuthHeaders(),
            success: recipientsLoaded
        });

        function recipientsLoaded(recipients) {
            for (let recipient of recipients) {
                let option = $("<option>").val(recipient.username);
                option.text(formatSender(recipient.username, recipient.name));
                $('#formSendMessage select').append(option);
            }
            showView('viewSendMessage');
        }
    }

    function sendMessage() {
        let messageData = {
            sender_username: sessionStorage.getItem('username'),
            sender_name: sessionStorage.getItem('name'),
            recipient_username: $('#formSendMessage select[name=recipient]').val(),
            text: $('#formSendMessage input[name=text]').val()
        };

        $.ajax({
            method: "POST",
            url: kinveyBaseUrl + "appdata/" + kinveyAppKey + "/messages",
            headers: getKinveyUserAuthHeaders(),
            contentType: "application/json",
            data: JSON.stringify(messageData),
            success: sendMessageSuccess
        });

        function sendMessageSuccess(response) {
            showArchiveSentView();
            showInfo('Message sent.');
        }
    }

    function logoutUser() {
        $.ajax({
            method: "POST",
            url: kinveyBaseUrl + "user/" + kinveyAppKey + "/_logout",
            headers: getKinveyUserAuthHeaders()
        });
        sessionStorage.clear();
        showHideMenuLinks();
        showAppHomeView();
        showInfo('Logout successful.');
    }
}
