export const quiz = {
  topic: "Javascript",
  level: "Beginner",
  totalQuestions: 4,
  perQuestionScore: 5,
  questions: [
    {
      question:
        "Which of the following tag is used to make the underlined text?",
      choices: ["<i>", "<ul>", "<u>", "<pre>"],

      correctAnswer: "<u>",
    },
    {
      question: " Which is the correct CSS syntax?",
      choices: [
        "body {color: black}",
        "{body;color:black}",
        "{body:color=black(body}",
        "body:color=black",
      ],
      correctAnswer: "body {color: black}",
    },
    {
      question:
        "Which of the following keywords is used to define a variable in Javascript?",
      choices: ["var", "let", "var and let", "None of the above"],
      correctAnswer: "var and let",
    },

    {
      question:
        "Which of the following tag is used to define options in a drop-down selection list?",
      choices: ["<select>", "<list>", "<dropdown>", "<option>"],

      correctAnswer: "<option>",
    },

    {
      question:
        "Which of the following CSS Property controls how an element is positioned?",
      choices: ["static", "position", "fix", "set"],

      correctAnswer: "position",
    },

    {
      question: "How can a datatype be declared to be a constant type?",
      choices: ["const", "var", "let", "constant"],

      correctAnswer: "const",
    },

    {
      question:
        "Which character is used to represent the closing of a tag in HTML?",
      choices: ["\\", "!", "/", "."],

      correctAnswer: "/",
    },

    {
      question: "In CSS, “font-size” can be called as?",
      choices: ["Selector", "Rule", "Property", "Property-Name"],

      correctAnswer: "Property-Name",
    },

    {
      question:
        "Which of the following methods can be used to display data in some form using Javascript?",
      choices: [
        "document.write()",
        "console.log()",
        "window.alert",
        "All of the above",
      ],

      correctAnswer: "All of the above",
    },
    {
      question:
        "Which of the following HTML tag is used to create an unordered list?",
      choices: ["<ol>", "<ul>", "<li>", "<ll>"],

      correctAnswer: "<ul>",
    },
  ],
};
