const axios = require('axios');

async function callClaudeForSkillQuestion(currentLevel, skill, description) {
    try {
        const response = await axios.post('https://api.anthropic.com/v1/messages', {
            model: "claude-3-5-sonnet-20240620",
            max_tokens: 1000,
            tools: [
                {
                    name: "create_skill_questions",
                    description: "Create a question that test the users competency level with a particular skill, the skill levels range from 1 - 1000, based on the users current skill level you are creating a question that exceeds that to test if they are better at it than before, include the skill level of the question you are asking",
                    input_schema: {
                        type: "object",
                        properties: {
                            question: {
                                type: "string",
                                description: "The question to ask the user pertaining to the skill level above where they are at"
                            },
                            skill_level_of_question: {
                                type: "number",
                                description: "the level at which the question is ranked at, given that 1000 is master level and 1 is illiterate at the skill, the level should be slightly higher than the current."
                            },
                            description: {
                                type: "string",
                                description: "a brief description of the skill being tested, only provided if one was not included by user"
                            },
                            color: {
                                type: "string",
                                description: "a color for the skill most aligned to it, only provided if description was not included by user"
                            }
                        },
                        required: ["question", "skill_level_of_question"]
                    }
                }
            ],
            system: `You are a skill tester, you will come up with questions that test the competency of a skill based on a question.
      The user may or may not have any competency in the skill but your test should be designed to find out if they are at a slightly higher level than they are currently at in the skill.
      This is all pure knowledge based, some skill can be easily measure at first like math 1 + 1 is 2, that's like a 1, a 1 year old can know this, harder question would include, for a skill like "front end development", a question would be "what is the the best way to architech a decentralized chat app", that would ran at level 485.
      A 30 year old with 10 years of experience would say, create a front end app using react or simple html connect with gunjs and put up some relays for data communication accorss devices. That answer would be correct and the user would now be level 465 at front end programming.
      Based on all you knowledge come up with a question whose ranking ranges from 1-1000, slightly higher than what the user currently is.
      The question can be open ended or specific, they will be assesed by a very capable large language model on submission to determine if the user answered correctly.
      if no description was given by the user, provide a description for the skill and an associated color in hex
      `,
            messages: [
                { role: "user", content: description ? `{skill : ${skill}, current_level: ${currentLevel}}` : `{skill : ${skill}, current_level: ${currentLevel}, description: ${description}}` }
            ]
        }, {
            headers: {
                'anthropic-version': '2023-06-01',
                'x-api-key': CLAUDE_API_KEY,
                'content-type': 'application/json'
            }
        });

        return response.data;
    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
        throw error;
    }
}

async function callClaudeForSkillAnswer(question, answer) {
    try {
        const response = await axios.post('https://api.anthropic.com/v1/messages', {
            model: "claude-3-5-sonnet-20240620",
            max_tokens: 1000,
            tools: [
                {
                    name: "evaluate_answer",
                    description: "Reply true or false on whether the given response correctly asnwers the question",
                    input_schema: {
                        type: "object",
                        properties: {
                            isCorrect: {
                                type: "boolean",
                                description: "Whether answer to the question is correct"
                            },
                            correctAnswer: {
                                type: "string",
                                description: "The correct answer in case the answer is wrong."
                            },
                            explanation: {
                                type: "string",
                                description: "Explain why answer was wrong, if it was wrong."
                            }
                        },
                        required: ["isCorrect"]
                    }
                }
            ],
            system: `
      You are an evaluator, you will evaluate answer that a user has given to a question a determine if the answer is correct or not.
      The question can be open ended or specific, they should be assesed to determine if the user answered correctly, use all your knowledge to determine so.`,
            messages: [
                { role: "user", content: `{question: ${question}, answer: ${answer}}` }
            ]
        }, {
            headers: {
                'anthropic-version': '2023-06-01',
                'x-api-key': CLAUDE_API_KEY,
                'content-type': 'application/json'
            }
        });

        return response.data;
    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
        throw error;
    }
}

exports.question = async (req, res) => {
    // Set CORS headers for all requests
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    const request = req.query.request || req.body.request;

    if (request === "question") {
        try {
            // Extract user prompt and context inputs from request
            const currentLevel = req.query.currentLevel || req.body.currentLevel;
            const skill = req.query.skill || req.body.skill;

            if (currentLevel === null) {
                res.status(400).send('Missing user prompt');
                return;
            }

            if (!skill) {
                res.status(400).send('Missing context inputs');
                return;
            }

            // Call Claude API
            const result = await callClaudeForSkillQuestion(currentLevel, skill);

            // Send response back to client
            res.status(200).json(result);
        } catch (error) {
            console.error('Error in generate function:', error);
            res.status(500).send('Internal Server Error');
        }
    } else if (request === "answer") {
        try {
            // Extract user prompt and context inputs from request
            const question = req.query.question || req.body.question;
            const answer = req.query.answer || req.body.answer;

            if (question === null) {
                res.status(400).send('Missing question');
                return;
            }

            if (!answer) {
                res.status(400).send('Missing answer');
                return;
            }

            // Call Claude API
            const result = await callClaudeForSkillAnswer(question, answer);

            // Send response back to client
            res.status(200).json(result);
        } catch (error) {
            console.error('Error in generate function:', error);
            res.status(500).send('Internal Server Error');
        }
    }
}